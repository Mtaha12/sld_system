import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const newsletterSchema = new mongoose.Schema({
  newsletterId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  newsletter_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  srNumber: {
    type: Number,
    index: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    default: 'Updates',
    trim: true,
    index: true,
  },
  message: {
    type: String,
    default: '',
  },
  attachment: {
    type: String,
    default: '',
  },
  attachmentName: {
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

newsletterSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'newsletter',
  prefix: 'NL',
  field: 'newsletterId',
  aliases: ['newsletter_id']
});

newsletterSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'newsletter_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('Newsletter').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

newsletterSchema.index({
  newsletterId: 'text',
  subject: 'text',
  category: 'text',
  message: 'text',
});

newsletterSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);
export default Newsletter;
