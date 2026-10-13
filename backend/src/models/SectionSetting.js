import mongoose from 'mongoose';

const sectionSettingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      unique: true,
    },
    ordering: {
      type: Number,
      default: 1,
    },
    law: {
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

sectionSettingSchema.index({ ordering: 1 });
sectionSettingSchema.index({ status: 1 });

const SectionSetting = mongoose.model('SectionSetting', sectionSettingSchema);

export default SectionSetting;
