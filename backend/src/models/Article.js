import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema(
  {
    srNumber: {
      type: Number,
      index: true,
    },
    year: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
    },
    author: {
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

articleSchema.index({ title: 'text', author: 'text' });

const Article = mongoose.model('Article', articleSchema);

export default Article;
