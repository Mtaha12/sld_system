import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';

const statuteBlockSchema = new mongoose.Schema({
  sectionHeading: { type: String, default: '' },
  fromDate: { type: String, default: null },
  toDate: { type: String, default: null },
  detail: { type: String, default: '' },
  attachments: { type: [String], default: [] }
});

const statuteSchema = new mongoose.Schema({
  statuteId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  statute_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  srNumber: {
    type: String,
    required: false,
    trim: true,
    index: true,
  },
  department: {
    type: String,
    default: 'tax',
    trim: true,
  },
  chapter: {
    type: String,
    default: '',
    trim: true,
  },
  law: {
    type: String,
    default: '',
    trim: true,
  },
  section: {
    type: String,
    default: '',
    trim: true,
  },
  heading: {
    type: String,
    default: '',
    trim: true,
  },
  blocks: {
    type: [statuteBlockSchema],
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
statuteSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'statute',
  prefix: 'STAT',
  field: 'statuteId',
  aliases: ['statute_id']
});

// Fallback srNumber to statuteId if not manually provided
statuteSchema.pre('save', async function () {
  if (!this.srNumber) {
    this.srNumber = this.statuteId;
  }
});

// Indexes for text search queries
statuteSchema.index({
  statuteId: 'text',
  statute_id: 'text',
  srNumber: 'text',
  law: 'text',
  chapter: 'text',
  section: 'text',
  heading: 'text',
  department: 'text',
  'blocks.sectionHeading': 'text',
  'blocks.detail': 'text'
});

// Soft delete query filter middleware
statuteSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Statute = mongoose.model('Statute', statuteSchema);
export default Statute;
