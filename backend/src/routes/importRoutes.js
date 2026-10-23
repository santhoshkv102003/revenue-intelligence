import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { ImportService, CANONICAL_FIELDS } from '../services/importService.js';
import { ImportBatch } from '../models/ImportBatch.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper to parse CSV buffer into array of row objects
function parseCSVBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// POST /api/imports/preview - Upload file and preview first rows, mapping, and duplicate classification
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    let rows = [];
    let filename = 'uploaded_data';
    let fileType = 'CSV';

    if (req.file) {
      filename = req.file.originalname;
      const lowerName = filename.toLowerCase();
      if (lowerName.endsWith('.json')) {
        fileType = 'JSON';
        const parsed = JSON.parse(req.file.buffer.toString('utf8'));
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        fileType = 'CSV';
        rows = await parseCSVBuffer(req.file.buffer);
      }
    } else if (req.body.jsonData) {
      fileType = 'JSON';
      const parsed = typeof req.body.jsonData === 'string' ? JSON.parse(req.body.jsonData) : req.body.jsonData;
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      return res.status(400).json({ error: 'No file or JSON data provided' });
    }

    if (!rows.length) {
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    const fileHeaders = Object.keys(rows[0] || {});
    // Auto-detect best match column mappings
    const detectedMapping = ImportService.autoDetectMapping(fileHeaders);

    // Run preview analysis
    const previewSummary = await ImportService.previewBatch(rows, detectedMapping);

    res.json({
      filename,
      fileType,
      totalRows: rows.length,
      fileHeaders,
      canonicalFields: CANONICAL_FIELDS,
      detectedMapping,
      previewSummary,
      rawRowsSample: rows.slice(0, 10),
      rawRows: rows // Return rows for confirmation payload
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process import preview', message: err.message });
  }
});

// POST /api/imports/commit - Commit reviewed rows with chosen mapping
router.post('/commit', async (req, res) => {
  try {
    const { rawRows = [], mapping = {}, filename = 'import_data.csv', fileType = 'CSV' } = req.body;
    if (!rawRows.length) {
      return res.status(400).json({ error: 'No rows provided to commit' });
    }

    const importBatch = await ImportService.commitBatch({
      rawRows,
      mapping,
      filename,
      fileType
    });

    res.json({
      message: 'Batch imported and processed successfully',
      batch: importBatch
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to commit import batch', message: err.message });
  }
});

// GET /api/imports/batches - List all import batches
router.get('/batches', async (req, res) => {
  try {
    const batches = await ImportBatch.find({}).sort({ importedAt: -1 });
    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch import batches', message: err.message });
  }
});

// GET /api/imports/batches/:id - Details of a specific batch
router.get('/batches/:id', async (req, res) => {
  try {
    const batch = await ImportBatch.findOne({ batchId: req.params.id }) || await ImportBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ batch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch batch details', message: err.message });
  }
});

export default router;
