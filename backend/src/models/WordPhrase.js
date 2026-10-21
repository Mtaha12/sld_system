import mongoose from 'mongoose';

const wordPhraseSchema = new mongoose.Schema(
  {
    srNumber: {
      type: Number,
      index: true,
    },
    heading: {
      type: String,
      required: [true, 'Word or phrase is required'],
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
  },
  {
    timestamps: true,
  }
);

wordPhraseSchema.index({ heading: 'text' });

const WordPhrase = mongoose.model('WordPhrase', wordPhraseSchema);

export default WordPhrase;
