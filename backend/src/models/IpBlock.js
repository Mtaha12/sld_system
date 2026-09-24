import mongoose from 'mongoose';

const ipBlockSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: [true, 'IP address is required'],
      trim: true,
      unique: true,
      index: true,
    },
    userName: {
      type: String,
      default: '',
      trim: true,
    },
    cityName: {
      type: String,
      default: '',
      trim: true,
    },
    reason: {
      type: String,
      default: 'Restricted by Admin',
      trim: true,
    },
    status: {
      type: String,
      enum: ['blocked', 'unblocked'],
      default: 'blocked',
      index: true,
    },
    dated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const IpBlock = mongoose.model('IpBlock', ipBlockSchema);

export default IpBlock;
