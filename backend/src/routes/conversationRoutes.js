import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { ManualCorrection } from '../models/ManualCorrection.js';
import { AnalysisService } from '../services/analysisService.js';
import { RoutingService } from '../services/routingService.js';

const router = express.Router();

// GET /api/conversations - Filterable, sortable, searchable inbox list
router.get('/', async (req, res) => {
  try {
    const {
      queue,
      priority,
      sentiment,
      salesRep,
      company,
      source,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    // Dedicated queue filters
    if (queue && queue !== 'All') {
      if (queue === 'High Priority') {
        query.effectivePriority = { $in: ['High', 'Urgent'] };
      } else if (queue === 'Recently Updated') {
        // Query records modified or imported recently
        query.updatedAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      } else {
        query.effectivePrimaryQueue = queue;
      }
    }

    if (priority && priority !== 'All') {
      query.effectivePriority = priority;
    }
    if (sentiment && sentiment !== 'All') {
      query.effectiveSentiment = sentiment;
    }
    if (salesRep && salesRep !== 'All') {
      query.effectiveSalesRep = salesRep;
    }
    if (company && company !== 'All') {
      query.company = company;
    }
    if (source && source !== 'All') {
      query.source = source;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { company: searchRegex },
        { contactName: searchRegex },
        { transcriptOrNotes: searchRegex },
        { externalId: searchRegex }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const totalCount = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      conversations,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations', message: err.message });
  }
});

// GET /api/conversations/:id - Full details
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    // Fetch manual correction history for this conversation
    const corrections = await ManualCorrection.find({ conversationId: conversation._id }).sort({ timestamp: -1 });

    res.json({
      conversation,
      corrections
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation details', message: err.message });
  }
});

// PATCH /api/conversations/:id/override - Manual override with audit trail
router.patch('/:id/override', async (req, res) => {
  try {
    const {
      priority,
      primaryQueue,
      sentiment,
      assignedSalesRep,
      nextAction,
      followUpStatus,
      notes,
      owner,
      reason = 'Manager review update',
      actor = 'Sales Operations Manager'
    } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const editableFields = {
      priority,
      primaryQueue,
      sentiment,
      assignedSalesRep,
      nextAction,
      followUpStatus,
      notes,
      owner
    };

    // Log changes to ManualCorrection collection
    for (const [field, newVal] of Object.entries(editableFields)) {
      if (newVal !== undefined && newVal !== null) {
        const prevVal = conversation.manualOverrides[field] !== null 
          ? conversation.manualOverrides[field] 
          : conversation[field] || (conversation.routing && conversation.routing[field]) || (conversation.analysis && conversation.analysis[field]);

        if (prevVal !== newVal) {
          await ManualCorrection.create({
            correctionId: `CORR-${Date.now()}-${uuidv4().substring(0, 5)}`,
            conversationId: conversation._id,
            externalId: conversation.externalId,
            field,
            previousValue: prevVal,
            newValue: newVal,
            reason,
            actor,
            timestamp: new Date()
          });

          conversation.manualOverrides[field] = newVal;
        }
      }
    }

    conversation.manualOverrides.isOverridden = true;
    conversation.manualOverrides.lastOverriddenAt = new Date();
    conversation.manualOverrides.lastOverriddenBy = actor;
    conversation.manualOverrides.overrideReason = reason;

    conversation.syncEffectiveFields();
    await conversation.save();

    res.json({
      message: 'Manual override applied and audit recorded successfully',
      conversation
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record manual override', message: err.message });
  }
});

// POST /api/conversations/:id/reset-field - Reset an overridden field to source/heuristic
router.post('/:id/reset-field', async (req, res) => {
  try {
    const { field, actor = 'Sales Operations Manager' } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    if (conversation.manualOverrides[field] !== undefined) {
      const prevVal = conversation.manualOverrides[field];
      conversation.manualOverrides[field] = null;

      await ManualCorrection.create({
        correctionId: `RESET-${Date.now()}-${uuidv4().substring(0, 5)}`,
        conversationId: conversation._id,
        externalId: conversation.externalId,
        field,
        previousValue: prevVal,
        newValue: 'RESET_TO_SOURCE',
        reason: 'Reset manual override to original calculated/source value',
        actor,
        timestamp: new Date()
      });

      // Check if any other override exists
      const remainingOverrides = Object.entries(conversation.manualOverrides.toObject())
        .filter(([k, v]) => !['isOverridden', 'lastOverriddenAt', 'lastOverriddenBy', 'overrideReason'].includes(k) && v !== null);
      if (remainingOverrides.length === 0) {
        conversation.manualOverrides.isOverridden = false;
      }

      conversation.syncEffectiveFields();
      await conversation.save();
    }

    res.json({ message: `Field ${field} reset successfully`, conversation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset field', message: err.message });
  }
});

// POST /api/conversations/:id/reanalyze - Re-run pipeline while preserving manual overrides
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const newAnalysis = await AnalysisService.analyzeConversation(conversation);
    const newRouting = RoutingService.evaluateRouting(conversation, newAnalysis);

    conversation.analysis = newAnalysis;
    conversation.routing = newRouting;
    conversation.syncEffectiveFields();
    await conversation.save();

    res.json({ message: 'Conversation re-analyzed successfully', conversation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to re-analyze conversation', message: err.message });
  }
});

// POST /api/conversations/bulk - Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { conversationIds = [], action, value, reason = 'Bulk update', actor = 'Sales Operations Manager' } = req.body;
    if (!conversationIds.length) {
      return res.status(400).json({ error: 'No conversation IDs provided' });
    }

    let updatedCount = 0;
    for (const id of conversationIds) {
      const conv = await Conversation.findById(id);
      if (!conv) continue;

      if (action === 'assignOwner') {
        conv.manualOverrides.owner = value;
        conv.manualOverrides.isOverridden = true;
      } else if (action === 'setPriority') {
        conv.manualOverrides.priority = value;
        conv.manualOverrides.isOverridden = true;
      } else if (action === 'markReviewed') {
        conv.reviewStatus = 'Reviewed';
      }

      conv.syncEffectiveFields();
      await conv.save();

      await ManualCorrection.create({
        correctionId: `BULK-${Date.now()}-${uuidv4().substring(0, 5)}`,
        conversationId: conv._id,
        externalId: conv.externalId,
        field: action,
        previousValue: 'BULK_ACTION_PREV',
        newValue: value,
        reason,
        actor,
        timestamp: new Date()
      });

      updatedCount++;
    }

    res.json({ message: `Successfully updated ${updatedCount} conversations`, updatedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute bulk action', message: err.message });
  }
});

export default router;
