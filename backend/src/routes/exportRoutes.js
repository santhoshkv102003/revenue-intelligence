import express from 'express';
import path from 'path';
import fs from 'fs';
import { ExportService } from '../services/exportService.js';
import { ExportJob } from '../models/ExportJob.js';
import { ENV } from '../config/env.js';

const router = express.Router();

// POST /api/exports/generate - Generate export files and manifest with verified checksums
router.post('/generate', async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const result = await ExportService.generateExportPackage(filters);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate export package', message: err.message });
  }
});

// GET /api/exports/jobs - List historical export jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await ExportJob.find({}).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch export jobs', message: err.message });
  }
});

// GET /api/exports/:exportId/download/:filename - Download individual export file
router.get('/:exportId/download/:filename', async (req, res) => {
  try {
    const { exportId, filename } = req.params;
    // Security check to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.resolve(ENV.EXPORT_DIR, exportId, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    res.download(filePath, safeFilename);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file', message: err.message });
  }
});

// GET /api/exports/:exportId/download-zip - Download complete ZIP archive
router.get('/:exportId/download-zip', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportJob = await ExportJob.findOne({ exportId });
    const zipName = (exportJob && exportJob.zipFilename) || `${exportId}_all_exports.zip`;
    const zipPath = path.resolve(ENV.EXPORT_DIR, exportId, zipName);

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'Export ZIP archive not found' });
    }

    res.download(zipPath, zipName);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download zip archive', message: err.message });
  }
});

export default router;
