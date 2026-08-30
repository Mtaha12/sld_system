import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';

const publicationSchema = new mongoose.Schema({
  year: { type: String, default: '' },
  vol: { type: String, default: '' },
  mag: { type: String, default: 'sld' },
  page: { type: String, default: '' },
  month: { type: String, default: 'may' }
});

const lawReferenceSchema = new mongoose.Schema({
  lawStatute: { type: String, default: '' },
  section: { type: String, default: '' }
});

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, default: '' },
  size: { type: String, default: '' },
  type: { type: String, default: 'pdf' }
});

const caseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  case_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  sldNumber: {
    type: String,
    required: false,
    trim: true,
    index: true,
  },
  dated: {
    type: String,
    default: null,
  },
  department: {
    type: String,
    default: 'tax',
    lowercase: true,
    trim: true,
  },
  court: {
    type: String,
    default: '',
    trim: true,
  },
  caseNumber: {
    type: [String],
    default: [],
  },
  judges: {
    type: [String],
    default: [],
  },
  petitioners: {
    type: [String],
    default: [],
  },
  lawyers: {
    type: [String],
    default: [],
  },
  headNote: {
    type: String,
    default: '',
  },
  references: {
    type: String,
    default: '',
  },
  principleLaw: {
    type: String,
    default: '',
  },
  judgment: {
    type: String,
    default: '',
  },
  publications: {
    type: [publicationSchema],
    default: [],
  },
  laws: {
    type: [lawReferenceSchema],
    default: [],
  },
  attachments: {
    type: [attachmentSchema],
    default: [],
  },
  status: {
    type: String,
    default: 'Active',
  },
  // We keep a backup of the original mapYearPage array from the seed data
  mapYearPage: {
    type: [String],
    default: [],
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
});

// Apply auto unique ID plugin
caseSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'case',
  prefix: 'CASE',
  field: 'caseId',
  aliases: ['case_id']
});

// Fallback sldNumber to caseId if not manually provided
caseSchema.pre('save', async function () {
  if (!this.sldNumber) {
    this.sldNumber = this.caseId;
  }
});

// Indexes for high performance search
caseSchema.index({
  caseId: 'text',
  case_id: 'text',
  sldNumber: 'text',
  court: 'text',
  caseNumber: 'text',
  judges: 'text',
  lawyers: 'text',
  petitioners: 'text',
  headNote: 'text',
  references: 'text',
  principleLaw: 'text',
});

// Soft delete query filter middleware
caseSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Case = mongoose.model('Case', caseSchema);
export default Case;
