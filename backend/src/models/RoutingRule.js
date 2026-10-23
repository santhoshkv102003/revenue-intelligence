import mongoose from 'mongoose';

const RoutingRuleSchema = new mongoose.Schema({
  ruleId: { type: String, required: true, unique: true, index: true },
  ruleName: { type: String, required: true },
  targetQueue: { 
    type: String, 
    required: true,
    enum: [
      'High Priority', 
      'Follow-up Required', 
      'Customer Risk', 
      'Pricing and Negotiation', 
      'Technical Questions', 
      'Positive Buying Signals', 
      'General Conversations', 
      'Unassigned / Needs Review'
    ]
  },
  weight: { type: Number, default: 20 },
  keywords: [{ type: String }],
  regexPattern: { type: String, default: '' },
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  ruleVersion: { type: String, default: 'v1.4.0' }
}, {
  timestamps: true
});

export const RoutingRule = mongoose.model('RoutingRule', RoutingRuleSchema);
