import mongoose from 'mongoose';

const courtSettingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Court name is required'],
      trim: true,
      unique: true,
    },
    underCourt: {
      type: String,
      enum: ['Supreme Court', 'High Court', 'Tribunal', 'Federal Court', 'Special Court', 'Other'],
      default: 'High Court',
      required: [true, 'Under Court is required'],
      index: true,
    },
    ordering: {
      type: Number,
      default: 1,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'Active', 'Inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const CourtSetting = mongoose.model('CourtSetting', courtSettingSchema);

export default CourtSetting;
