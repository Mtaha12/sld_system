import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';

const userActivitySchema = new mongoose.Schema(
  {
    activityId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ['case', 'notification', 'statute'],
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    loginId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
    },
    agency: {
      type: String,
      default: 'General',
      trim: true,
    },
    documentId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    documentNumber: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    documentTitle: {
      type: String,
      default: '',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
      trim: true,
    },
    dated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

userActivitySchema.plugin(autoUniqueIdPlugin, {
  entityName: 'activity',
  prefix: 'ACT',
  field: 'activityId',
});

userActivitySchema.index({ activityType: 1, dated: -1 });
userActivitySchema.index({ loginId: 1, dated: -1 });

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
