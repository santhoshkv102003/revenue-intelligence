import mongoose from 'mongoose';

const ManualCorrectionSchema = new mongoose.Schema({
  correctionId: { type: String, required: true, unique: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  externalId: { type: String, required: true, index: true },
  field: { type: String, required: true },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String, required: true },
  actor: { type: String, default: 'Sales Manager (Admin)' },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

export const ManualCorrection = mongoose.model('ManualCorrection', ManualCorrectionSchema);
