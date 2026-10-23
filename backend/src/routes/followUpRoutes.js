import express from 'express';
import { FollowUpAction } from '../models/FollowUpAction.js';

const router = express.Router();

// GET /api/follow-ups - List follow-up action items with status and filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignedTo, company, search } = req.query;
    const query = {};

    if (status && status !== 'All') query.status = status;
    if (priority && priority !== 'All') query.priority = priority;
    if (assignedTo && assignedTo !== 'All') query.assignedTo = assignedTo;
    if (company && company !== 'All') query.company = company;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ task: regex }, { company: regex }, { externalId: regex }];
    }

    const actions = await FollowUpAction.find(query).sort({ createdAt: -1 });
    res.json({ actions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follow-up actions', message: err.message });
  }
});

// PATCH /api/follow-ups/:id - Update action item status
router.patch('/:id', async (req, res) => {
  try {
    const { status, assignedTo, dueDate } = req.body;
    const action = await FollowUpAction.findById(req.params.id) || await FollowUpAction.findOne({ actionId: req.params.id });
    if (!action) return res.status(404).json({ error: 'Action item not found' });

    if (status) {
      action.status = status;
      if (status === 'Completed') action.completedAt = new Date();
    }
    if (assignedTo) action.assignedTo = assignedTo;
    if (dueDate) action.dueDate = dueDate;

    await action.save();
    res.json({ message: 'Action item updated', action });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update action item', message: err.message });
  }
});

export default router;
