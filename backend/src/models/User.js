import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  user_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  role: {
    type: String,
    enum: ['User', 'Administrator'],
    default: 'Administrator',
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  companyName: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
    default: null,
  },
  verificationCodeExpires: {
    type: Date,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
});

// Apply auto unique ID plugin
userSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'user',
  prefix: 'USER',
  field: 'userId',
  aliases: ['user_id']
});

// Pre-save hook to hash password if it was modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Global query middleware to filter out soft-deleted records
userSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const User = mongoose.model('User', userSchema);
export default User;
