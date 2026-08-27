import mongoose from 'mongoose';

const statuteBlockSchema = new mongoose.Schema({
  sectionHeading: { type: String, default: '' },
  fromDate: { type: String, default: null },
  toDate: { type: String, default: null },
  detail: { type: String, default: '' },
  attachments: { type: [String], default: [] }
});

const statuteSchema = new mongoose.Schema({
  srNumber: {
    type: String,
    required: [true, 'Statute SR # is required'],
    unique: true,
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
  display: {
    type: String,
    default: 'yes',
  },
  status: {
    type: String,
    default: 'active',
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

// Indexes for text search queries
statuteSchema.index({
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
