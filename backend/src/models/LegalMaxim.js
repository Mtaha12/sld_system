import mongoose from 'mongoose';

const legalMaximSchema = new mongoose.Schema(
  {
    srNumber: {
      type: Number,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Legal Maxim is required'],
      trim: true,
      index: true,
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
      index: true,
    },
    viewType: {
      type: String,
      enum: ['', 'file', 'link', 'text'],
      default: '',
    },
    viewData: {
      type: String,
      default: '',
      trim: true,
    },
    viewTitle: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: [
      {
        name: { type: String, default: '' },
        url: { type: String, default: '' },
        size: { type: Number, default: 0 }
      }
    ],
    citations: [
      {
        yearVol: { type: String, default: '' },
        mag: { type: String, default: '' },
        page: { type: String, default: '' }
      }
    ],

  },
  {
    timestamps: true,
  }
);

legalMaximSchema.index({ name: 'text', meaning: 'text' });

const LegalMaxim = mongoose.model('LegalMaxim', legalMaximSchema);

export default LegalMaxim;
