import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';

const notificationBlockSchema = new mongoose.Schema({
  date: { type: String, default: null },
  detail: { type: String, default: '' },
  attachments: { type: [String], default: [] }
});

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  notification_id: {
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
  srNumberInt: {
    type: Number,
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

// Apply auto unique ID plugin
notificationSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'notification',
  prefix: 'NOTIF',
  field: 'notificationId',
  aliases: ['notification_id']
});

// Fallback srNumber to notificationId if not manually provided and populate srNumberInt
notificationSchema.pre('save', async function () {
  if (!this.srNumber) {
    this.srNumber = this.notificationId;
  }
  if (this.srNumber) {
    const parsed = parseInt(String(this.srNumber).replace(/\D+/g, ''), 10);
    this.srNumberInt = !isNaN(parsed) ? parsed : null;
  }
});

// Search indexing
notificationSchema.index({
  notificationId: 'text',
  notification_id: 'text',
  srNumber: 'text',
  number: 'text',
  sroNumber: 'text',
  subject: 'text',
  lawStatute: 'text',
  section: 'text',
  department: 'text',
  'blocks.detail': 'text'
});
notificationSchema.index({ isDeleted: 1, srNumberInt: -1 });
notificationSchema.index({ isDeleted: 1, srNumberInt: 1 });
notificationSchema.index({ isDeleted: 1, createdAt: -1, srNumber: -1 });
notificationSchema.index({ isDeleted: 1, srNumber: -1 });
notificationSchema.index({ isDeleted: 1, year: -1 });
notificationSchema.index({ isDeleted: 1, department: 1 });

// Soft delete query filter middleware
notificationSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
