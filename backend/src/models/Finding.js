import mongoose from 'mongoose';

const SupportingSnippetSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  externalId: { type: String, default: '' },
  company: { type: String, default: '' },
  quote: { type: String, required: true },
  context: { type: String, default: '' }
}, { _id: false });

const FindingSchema = new mongoose.Schema({
  findingId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Customer Risk', 'Technical Blocker', 'Pricing & Negotiation', 'Operational Gap', 'Strategic'],
    default: 'Operational Gap'
  },
  conciseExplanation: { type: String, required: true },
  quantitativeEvidence: { type: String, required: true },
  affectedConversationIds: [{ type: String }],
  supportingSnippets: [SupportingSnippetSchema],
  interpretation: { type: String, required: true },
  businessImplication: { type: String, required: true },
  recommendedAction: { type: String, required: true },
  confidenceLabel: { type: String, enum: ['High Confidence', 'Medium Confidence', 'Preliminary'], default: 'High Confidence' },
  confidenceScore: { type: Number, default: 0.92 },
  limitations: { type: String, required: true },
  
  // Documented Rejected Decision support
  isRejectedDecision: { type: Boolean, default: false },
  rejectedAlternative: { type: String, default: '' },
  rejectionRationale: { type: String, default: '' },
  revisitCondition: { type: String, default: '' },

  calculatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Finding = mongoose.model('Finding', FindingSchema);
