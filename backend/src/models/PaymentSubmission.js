import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';

const paymentSubmissionSchema = new mongoose.Schema({
  submissionId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  submission_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
  },
  file_path: {
    type: String,
  },
  fileName: {
    type: String,
    default: '',
  },
  file_name: {
    type: String,
    default: '',
  },
  mimeType: {
    type: String,
    enum: ['image/jpeg', 'image/png', 'application/pdf'],
    required: [true, 'MIME type is required'],
  },
  mime_type: {
    type: String,
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
  },
  file_size: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'PENDING_REVIEW',
    index: true,
  },
  rejectionReason: {
    type: String,
    default: null,
    trim: true,
  },
  rejection_reason: {
    type: String,
    default: null,
    trim: true,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewed_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Mirror snake_case and camelCase fields before saving
paymentSubmissionSchema.pre('save', function (next) {
  if (this.userId && !this.user_id) this.user_id = this.userId;
  if (this.user_id && !this.userId) this.userId = this.user_id;

  if (this.filePath && !this.file_path) this.file_path = this.filePath;
  if (this.file_path && !this.filePath) this.filePath = this.file_path;

  if (this.fileName && !this.file_name) this.file_name = this.fileName;
  if (this.file_name && !this.fileName) this.fileName = this.file_name;

  if (this.mimeType && !this.mime_type) this.mime_type = this.mimeType;
  if (this.mime_type && !this.mimeType) this.mimeType = this.mime_type;

  if (this.fileSize && !this.file_size) this.file_size = this.fileSize;
  if (this.file_size && !this.fileSize) this.fileSize = this.file_size;

  if (this.rejectionReason && !this.rejection_reason) this.rejection_reason = this.rejectionReason;
  if (this.rejection_reason && !this.rejectionReason) this.rejectionReason = this.rejection_reason;

  if (this.reviewedAt && !this.reviewed_at) this.reviewed_at = this.reviewedAt;
  if (this.reviewed_at && !this.reviewedAt) this.reviewedAt = this.reviewed_at;

  if (typeof next === 'function') next();
});

// Apply auto unique ID plugin
paymentSubmissionSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'payment',
  prefix: 'PAY',
  field: 'submissionId',
  aliases: ['submission_id']
});

const PaymentSubmission = mongoose.model('PaymentSubmission', paymentSubmissionSchema);
export default PaymentSubmission;
