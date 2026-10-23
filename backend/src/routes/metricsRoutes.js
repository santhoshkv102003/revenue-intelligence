import express from 'express';
import { MetricsService } from '../services/metricsService.js';

const router = express.Router();

// GET /api/metrics/dashboard - Dynamic dashboard metrics
router.get('/dashboard', async (req, res) => {
  try {
    const { salesRep, company, priority, source, primaryQueue, startDate, endDate } = req.query;
    const metrics = await MetricsService.computeDashboardMetrics({
      salesRep,
      company,
      priority,
      source,
      primaryQueue,
      startDate,
      endDate
    });

    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute dashboard metrics', message: err.message });
  }
});

export default router;
