import mongoose from 'mongoose';

const lawSettingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Law or Statute name is required'],
      trim: true,
      unique: true,
    },
    ordering: {
      type: Number,
      default: 1,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    court: {
      type: String,
      trim: true,
      default: '',
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

lawSettingSchema.index({ ordering: 1 });
lawSettingSchema.index({ status: 1 });

const LawSetting = mongoose.model('LawSetting', lawSettingSchema);

export default LawSetting;
