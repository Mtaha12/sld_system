import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const taxCardSchema = new mongoose.Schema({
  taxCardId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  tax_card_id: {
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
  heading: {
    type: String,
    required: [true, 'Heading is required'],
    trim: true,
  },
  category: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    index: true,
  },
  attachment: {
    type: String,
    default: '',
  },
  attachmentName: {
    type: String,
    default: '',
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

taxCardSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'taxcard',
  prefix: 'TC',
  field: 'taxCardId',
  aliases: ['tax_card_id']
});

taxCardSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    const latest = await mongoose.model('TaxCard')
      .findOne({ isDeleted: { $ne: true } })
      .sort({ srNumber: -1 })
      .select('srNumber')
      .lean();
    const expectedNext = (Number(latest?.srNumber) || 0) + 1;

    try {
      const existingCounter = await Counter.findById('tax_card_sr_seq').lean();
      let counter;
      if (!existingCounter || existingCounter.seq !== expectedNext - 1) {
        counter = await Counter.findByIdAndUpdate(
          'tax_card_sr_seq',
          { $set: { seq: expectedNext } },
          { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );
      } else {
        counter = await Counter.findByIdAndUpdate(
          'tax_card_sr_seq',
          { $inc: { seq: 1 } },
          { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );
      }
      this.srNumber = counter.seq;
    } catch {
      this.srNumber = expectedNext;
    }
  }
});

taxCardSchema.index({
  taxCardId: 'text',
  heading: 'text',
  detail: 'text',
});

taxCardSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

taxCardSchema.index({ isDeleted: 1, srNumber: -1, createdAt: -1 });
taxCardSchema.index({ isDeleted: 1, category: 1, srNumber: -1 });

const TaxCard = mongoose.model('TaxCard', taxCardSchema);
export default TaxCard;
