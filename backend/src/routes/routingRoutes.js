import express from 'express';
import { Conversation } from '../models/Conversation.js';
import { RoutingRule } from '../models/RoutingRule.js';
import { RoutingService } from '../services/routingService.js';

const router = express.Router();

// GET /api/routing/audit - Routing Audit page data
router.get('/audit', async (req, res) => {
  try {
    const { queue, conflictOnly, search, limit = 50, page = 1 } = req.query;
    const query = {};

    if (queue && queue !== 'All') {
      query.effectivePrimaryQueue = queue;
    }
    if (conflictOnly === 'true') {
      query['routing.conflictDetected'] = true;
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { externalId: searchRegex },
        { company: searchRegex },
        { 'routing.explanation': searchRegex }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const totalCount = await Conversation.countDocuments(query);
    const decisions = await Conversation.find(query)
      .select('externalId company title salesRep effectivePriority effectivePrimaryQueue routing manualOverrides updatedAt')
      .sort({ 'routing.priorityScore': -1, updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      decisions,
      ruleVersion: RoutingService.RULE_VERSION,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routing audit data', message: err.message });
  }
});

// GET /api/routing/rules - List active configurable routing rules
router.get('/rules', async (req, res) => {
  try {
    let rules = await RoutingRule.find({}).sort({ weight: -1 });
    if (rules.length === 0) {
      // Seed default system rules if empty
      const defaultRules = [
        {
          ruleId: 'RULE-RISK-01',
          ruleName: 'Customer Dissatisfaction & Churn Risk',
          targetQueue: 'Customer Risk',
          weight: 35,
          keywords: ['cancel', 'churn', 'unacceptable', 'disappointed', 'breach', 'terrible experience'],
          description: 'Identifies cancellation threats, severe dissatisfaction, and negative relationship sentiment.'
        },
        {
          ruleId: 'RULE-BUY-01',
          ruleName: 'Commercial Progression & Buying Intent',
          targetQueue: 'Positive Buying Signals',
          weight: 30,
          keywords: ['ready to sign', 'send contract', 'budget approved', 'procurement', 'roll out', 'pilot successful'],
          description: 'Flags explicit commitment to purchase, contract requests, and executive sponsorship.'
        },
        {
          ruleId: 'RULE-TECH-01',
          ruleName: 'Architecture, Security & Integration Prerequisites',
          targetQueue: 'Technical Questions',
          weight: 25,
          keywords: ['sso', 'saml', 'okta', 'api rate limit', 'security review', 'soc2', 'hipaa', 'webhook'],
          description: 'Routes security clearances, architecture dependencies, and technical validation requests.'
        },
        {
          ruleId: 'RULE-PRICE-01',
          ruleName: 'Commercial Terms & Discount Negotiation',
          targetQueue: 'Pricing and Negotiation',
          weight: 25,
          keywords: ['discount', 'per seat', 'expensive', 'annual contract', 'payment terms', 'budget pushback'],
          description: 'Detects discount demands, contract pricing restructuring, and commercial obstacles.'
        },
        {
          ruleId: 'RULE-FOL-01',
          ruleName: 'Explicit Team Commitments & Pending Deliverables',
          targetQueue: 'Follow-up Required',
          weight: 20,
          keywords: ['will send', 'i will email', 'promise to follow up', 'let me share', 'agreed to deliver'],
          description: 'Tracks explicit promises made to prospects requiring verified follow-up.'
        }
      ];
      rules = await RoutingRule.insertMany(defaultRules);
    }
    res.json({ rules, currentVersion: RoutingService.RULE_VERSION });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routing rules', message: err.message });
  }
});

// PATCH /api/routing/rules/:ruleId - Toggle or adjust rule weight
router.patch('/rules/:ruleId', async (req, res) => {
  try {
    const { weight, isActive } = req.body;
    const rule = await RoutingRule.findOne({ ruleId: req.params.ruleId });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    if (weight !== undefined) rule.weight = weight;
    if (isActive !== undefined) rule.isActive = isActive;
    await rule.save();

    res.json({ message: 'Routing rule updated successfully', rule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update routing rule', message: err.message });
  }
});

export default router;
