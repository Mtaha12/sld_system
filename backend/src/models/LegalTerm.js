import mongoose from 'mongoose';

const legalTermSchema = new mongoose.Schema(
  {
    srNumber: {
      type: Number,
      index: true,
    },
    heading: {
      type: String,
      required: [true, 'Legal term is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

legalTermSchema.index({ heading: 'text' });

const LegalTerm = mongoose.model('LegalTerm', legalTermSchema);

export default LegalTerm;
