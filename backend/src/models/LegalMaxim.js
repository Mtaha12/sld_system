import mongoose from 'mongoose';

const legalMaximSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Legal Maxim is required'],
      trim: true,
      unique: true,
    },
    meaning: {
      type: String,
      default: '',
      trim: true,
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

legalMaximSchema.index({ status: 1 });

const LegalMaxim = mongoose.model('LegalMaxim', legalMaximSchema);

export default LegalMaxim;
