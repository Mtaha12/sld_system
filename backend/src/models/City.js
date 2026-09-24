import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      unique: true,
    },
    province: {
      type: String,
      required: [true, 'Province is required'],
      trim: true,
      default: 'Punjab',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

citySchema.index({ province: 1 });
citySchema.index({ status: 1 });

const City = mongoose.model('City', citySchema);

export default City;
