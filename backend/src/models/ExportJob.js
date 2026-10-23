import mongoose from 'mongoose';

const ExportFileEntrySchema = new mongoose.Schema({
  filename: { type: String, required: true },
  recordCount: { type: Number, required: true },
  sha256: { type: String, required: true },
  sizeBytes: { type: Number, default: 0 }
}, { _id: false });

const ExportJobSchema = new mongoose.Schema({
  exportId: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  filterCriteria: { type: mongoose.Schema.Types.Mixed, default: {} },
  filesGenerated: [ExportFileEntrySchema],
  totalRecords: { type: Number, default: 0 },
  manifestData: { type: mongoose.Schema.Types.Mixed },
  zipFilename: { type: String, default: '' },
  status: { type: String, enum: ['Completed', 'Failed', 'Processing'], default: 'Completed' }
}, {
  timestamps: true
});

export const ExportJob = mongoose.model('ExportJob', ExportJobSchema);
