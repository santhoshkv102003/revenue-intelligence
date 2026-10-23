import mongoose from 'mongoose';

const ActionItemSchema = new mongoose.Schema({
  task: { type: String, required: true },
  owner: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  evidenceSnippet: { type: String, default: '' }
}, { _id: false });

const EvidenceSnippetSchema = new mongoose.Schema({
  tag: { type: String, required: true },
  text: { type: String, required: true },
  quote: { type: String, required: true },
  relevanceScore: { type: Number, default: 0.8 }
}, { _id: false });

const MatchedRuleSchema = new mongoose.Schema({
  ruleId: { type: String, required: true },
  ruleName: { type: String, required: true },
  queue: { type: String, required: true },
  weight: { type: Number, default: 10 },
  snippet: { type: String, default: '' }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  // 1. Source / Imported Metadata (Immutable source of truth)
  externalId: { type: String, required: true, index: true },
  source: { type: String, required: true, default: 'Manual Upload' },
  title: { type: String, required: true },
  contactName: { type: String, default: 'Unknown Contact' },
  contactEmail: { type: String, default: '' },
  company: { type: String, required: true, index: true },
  salesRep: { type: String, required: true, index: true },
  conversationType: { 
    type: String, 
    enum: ['Discovery', 'Demo', 'Negotiation', 'QBR', 'Technical Deep Dive', 'Follow-up', 'Escalation', 'General'],
    default: 'Discovery'
  },
  timestamp: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, default: 30 },
  transcriptOrNotes: { type: String, required: true },
  opportunityId: { type: String, default: '' },
  sourceStatus: { type: String, default: 'Completed' },
  sourceNextAction: { type: String, default: '' },
  sourceLastModified: { type: Date, default: Date.now },
  normalizedHash: { type: String, index: true },
  importBatchId: { type: String, default: '' },
  isAmbiguousMatch: { type: Boolean, default: false },
  ambiguousReason: { type: String, default: '' },

  // 2. Pluggable Conversation Analysis Pipeline Output
  analysis: {
    engine: { type: String, default: 'deterministic-heuristic-v1.4' },
    analyzedAt: { type: Date, default: Date.now },
    summary: { type: String, default: '' },
    keyDiscussionPoints: [{ type: String }],
    customerPainPoints: [{ type: String }],
    buyingIntentSignals: [{ type: String }],
    objections: [{ type: String }],
    competitorMentions: [{ type: String }],
    pricingDiscussions: [{ type: String }],
    technicalQuestions: [{ type: String }],
    commitmentsAndPromises: [{ type: String }],
    actionItems: [ActionItemSchema],
    deadlines: [{ type: String }],
    sentiment: { 
      type: String, 
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Neutral'
    },
    sentimentScore: { type: Number, default: 0 },
    riskIndicators: [{ type: String }],
    suggestedNextSteps: [{ type: String }],
    evidenceSnippets: [EvidenceSnippetSchema]
  },

  // 3. Explainable Routing Engine Output
  routing: {
    primaryQueue: { 
      type: String, 
      default: 'Unassigned / Needs Review'
    },
    assignedQueues: [{ type: String }],
    priority: { 
      type: String, 
      enum: ['Urgent', 'High', 'Medium', 'Low'],
      default: 'Medium'
    },
    priorityScore: { type: Number, default: 50 },
    routingScore: { type: Number, default: 50 },
    scoreBreakdown: {
      urgency: { type: Number, default: 0 },
      customerRisk: { type: Number, default: 0 },
      buyingIntent: { type: Number, default: 0 },
      technicalBlocker: { type: Number, default: 0 },
      deadlineProximity: { type: Number, default: 0 },
      commitments: { type: Number, default: 0 }
    },
    matchedRules: [MatchedRuleSchema],
    ruleVersion: { type: String, default: 'v1.4.0-composite' },
    explanation: { type: String, default: '' },
    conflictDetected: { type: Boolean, default: false },
    conflictExplanation: { type: String, default: '' },
    evaluatedAt: { type: Date, default: Date.now }
  },

  // 4. Manual Overrides (Field Ownership Protection - Preserved on Re-import!)
  manualOverrides: {
    isOverridden: { type: Boolean, default: false },
    priority: { type: String, enum: ['Urgent', 'High', 'Medium', 'Low', null], default: null },
    primaryQueue: { type: String, default: null },
    sentiment: { type: String, enum: ['Positive', 'Neutral', 'Negative', null], default: null },
    assignedSalesRep: { type: String, default: null },
    nextAction: { type: String, default: null },
    followUpStatus: { type: String, enum: ['Open', 'In Progress', 'Completed', 'Dismissed', null], default: null },
    accountAssociation: { type: String, default: null },
    notes: { type: String, default: null },
    owner: { type: String, default: null },
    lastOverriddenAt: { type: Date, default: null },
    lastOverriddenBy: { type: String, default: null },
    overrideReason: { type: String, default: null }
  },

  // 5. Effective Materialized Fields for high performance querying
  effectivePriority: { type: String, default: 'Medium', index: true },
  effectivePrimaryQueue: { type: String, default: 'Unassigned / Needs Review', index: true },
  effectiveSentiment: { type: String, default: 'Neutral', index: true },
  effectiveSalesRep: { type: String, default: '', index: true },
  effectiveOwner: { type: String, default: '', index: true },
  effectiveFollowUpStatus: { type: String, default: 'None', index: true },
  effectiveNextAction: { type: String, default: '' },
  reviewStatus: { 
    type: String, 
    enum: ['Pending', 'Reviewed', 'Action Taken', 'Archived'],
    default: 'Pending',
    index: true
  }
}, {
  timestamps: true
});

// Composite unique-like index on source and externalId
ConversationSchema.index({ source: 1, externalId: 1 });

// Helper method to sync effective fields
ConversationSchema.methods.syncEffectiveFields = function() {
  this.effectivePriority = this.manualOverrides.priority || this.routing.priority || 'Medium';
  this.effectivePrimaryQueue = this.manualOverrides.primaryQueue || this.routing.primaryQueue || 'Unassigned / Needs Review';
  this.effectiveSentiment = this.manualOverrides.sentiment || this.analysis.sentiment || 'Neutral';
  this.effectiveSalesRep = this.manualOverrides.assignedSalesRep || this.salesRep;
  this.effectiveOwner = this.manualOverrides.owner || this.effectiveSalesRep;
  
  if (this.manualOverrides.followUpStatus) {
    this.effectiveFollowUpStatus = this.manualOverrides.followUpStatus;
  } else if (this.routing.assignedQueues.includes('Follow-up Required') || (this.analysis.actionItems && this.analysis.actionItems.length > 0)) {
    this.effectiveFollowUpStatus = 'Open';
  } else {
    this.effectiveFollowUpStatus = 'None';
  }

  this.effectiveNextAction = this.manualOverrides.nextAction || 
    (this.analysis.actionItems && this.analysis.actionItems[0] ? this.analysis.actionItems[0].task : '') || 
    this.sourceNextAction || 
    (this.analysis.suggestedNextSteps && this.analysis.suggestedNextSteps[0] ? this.analysis.suggestedNextSteps[0] : 'None recorded');
};

export const Conversation = mongoose.model('Conversation', ConversationSchema);
