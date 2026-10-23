import mongoose from 'mongoose';

const FollowUpActionSchema = new mongoose.Schema({
  actionId: { type: String, required: true, unique: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  externalId: { type: String, required: true, index: true },
  company: { type: String, required: true },
  task: { type: String, required: true },
  assignedTo: { type: String, required: true },
  dueDate: { type: String, default: 'Not specified' },
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Completed', 'Dismissed'],
    default: 'Open',
    index: true
  },
  priority: { 
    type: String, 
    enum: ['Urgent', 'High', 'Medium', 'Low'],
    default: 'High',
    index: true
  },
  sourceSnippet: { type: String, default: '' },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

export const FollowUpAction = mongoose.model('FollowUpAction', FollowUpActionSchema);
