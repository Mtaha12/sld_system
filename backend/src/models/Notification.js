import mongoose from 'mongoose';

const notificationBlockSchema = new mongoose.Schema({
  date: { type: String, default: null },
  detail: { type: String, default: '' },
  attachments: { type: [String], default: [] }
});

const notificationSchema = new mongoose.Schema({
  srNumber: {
    type: String,
    required: [true, 'Notification SR # is required'],
    unique: true,
    trim: true,
    index: true,
  },
  number: {
    type: String,
    default: '',
    trim: true,
  },
  year: {
    type: Number,
    default: new Date().getFullYear(),
  },
  department: {
    type: String,
    default: 'Notifications',
    trim: true,
  },
  subDepartment: {
    type: String,
    default: 'federal',
    trim: true,
  },
  sroNumber: {
    type: String,
    default: '',
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Notification Subject is required'],
    trim: true,
  },
  lawStatute: {
    type: String,
    default: '',
    trim: true,
  },
  section: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    default: 'Active',
  },
  lawDate: {
    type: String,
    default: '',
  },
  blocks: {
    type: [notificationBlockSchema],
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

// Search indexing
notificationSchema.index({
  srNumber: 'text',
  number: 'text',
  sroNumber: 'text',
  subject: 'text',
  lawStatute: 'text',
  section: 'text',
  department: 'text',
  'blocks.detail': 'text'
});

// Soft delete query filter middleware
notificationSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
