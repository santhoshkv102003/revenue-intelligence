import express from 'express';
import { FindingsService } from '../services/findingsService.js';

const router = express.Router();

// GET /api/findings - Compute dynamic evidence-backed findings and rejected decision
router.get('/', async (req, res) => {
  try {
    const findings = await FindingsService.computeFindings();
    res.json({
      findings,
      generatedAt: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute findings', message: err.message });
  }
});

export default router;
