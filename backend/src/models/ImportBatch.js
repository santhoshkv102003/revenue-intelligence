import mongoose from 'mongoose';

const ValidationErrorSchema = new mongoose.Schema({
  rowNumber: { type: Number, required: true },
  externalId: { type: String, default: '' },
  field: { type: String, default: '' },
  reason: { type: String, required: true }
}, { _id: false });

const FieldChangeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  oldVal: { type: mongoose.Schema.Types.Mixed },
  newVal: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const RecordUpdateSchema = new mongoose.Schema({
  externalId: { type: String, required: true },
  source: { type: String, required: true },
  changes: [FieldChangeSchema]
}, { _id: false });

const ImportBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  filename: { type: String, required: true },
  fileType: { type: String, enum: ['CSV', 'JSON'], default: 'CSV' },
  importedAt: { type: Date, default: Date.now },
  totalRows: { type: Number, default: 0 },
  newRecordsCount: { type: Number, default: 0 },
  updatedRecordsCount: { type: Number, default: 0 },
  duplicateRecordsCount: { type: Number, default: 0 },
  ambiguousRecordsCount: { type: Number, default: 0 },
  rejectedRecordsCount: { type: Number, default: 0 },
  validationErrors: [ValidationErrorSchema],
  recordUpdates: [RecordUpdateSchema],
  status: { 
    type: String, 
    enum: ['Preview', 'Committed', 'Failed'], 
    default: 'Committed' 
  },
  appliedMapping: { type: Map, of: String }
}, {
  timestamps: true
});

export const ImportBatch = mongoose.model('ImportBatch', ImportBatchSchema);
