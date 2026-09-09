import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const newsSchema = new mongoose.Schema({
  newsId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  news_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  srNumber: {
    type: Number,
    required: false,
    index: true,
  },
  heading: {
    type: String,
    required: [true, 'Heading is required'],
    trim: true,
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    default: () => new Date().getFullYear(),
    index: true,
  },
  detail: {
    type: String,
    default: '',
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
});

// Apply auto unique ID plugin
newsSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'news',
  prefix: 'NEWS',
  field: 'newsId',
  aliases: ['news_id']
});

// Auto-assign sequential numeric srNumber if not provided
newsSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'news_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch (err) {
      // Fallback to timestamp/random or count if counter fails
      const count = await mongoose.model('News').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

// Search indexing
newsSchema.index({
  newsId: 'text',
  heading: 'text',
  detail: 'text',
});

// Soft delete query filter middleware
newsSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const News = mongoose.model('News', newsSchema);
export default News;
