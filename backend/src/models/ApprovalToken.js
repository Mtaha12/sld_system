import mongoose from 'mongoose';

const approvalTokenSchema = new mongoose.Schema({
  paymentSubmissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentSubmission',
    required: [true, 'Payment submission ID is required'],
    index: true,
  },
  payment_submission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentSubmission',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  token: {
    type: String,
    required: [true, 'Approval token is required'],
    unique: true,
    trim: true,
    index: true,
  },
  actionType: {
    type: String,
    enum: ['APPROVE', 'REJECT', 'VIEW_PROOF'],
    required: [true, 'Action type is required'],
  },
  action_type: {
    type: String,
    enum: ['APPROVE', 'REJECT', 'VIEW_PROOF'],
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: true,
  },
  expires_at: {
    type: Date,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  used_at: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

approvalTokenSchema.pre('save', function (next) {
  if (this.paymentSubmissionId && !this.payment_submission_id) this.payment_submission_id = this.paymentSubmissionId;
  if (this.payment_submission_id && !this.paymentSubmissionId) this.paymentSubmissionId = this.payment_submission_id;

  if (this.userId && !this.user_id) this.user_id = this.userId;
  if (this.user_id && !this.userId) this.userId = this.user_id;

  if (this.actionType && !this.action_type) this.action_type = this.actionType;
  if (this.action_type && !this.actionType) this.actionType = this.action_type;

  if (this.expiresAt && !this.expires_at) this.expires_at = this.expiresAt;
  if (this.expires_at && !this.expiresAt) this.expiresAt = this.expires_at;

  if (this.usedAt && !this.used_at) this.used_at = this.usedAt;
  if (this.used_at && !this.usedAt) this.usedAt = this.used_at;

  if (this.createdAt && !this.created_at) this.created_at = this.createdAt;
  if (this.created_at && !this.createdAt) this.createdAt = this.created_at;

  if (typeof next === 'function') next();
});

const ApprovalToken = mongoose.model('ApprovalToken', approvalTokenSchema);
export default ApprovalToken;
