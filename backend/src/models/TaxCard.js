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
    try {
      const counter = await Counter.findByIdAndUpdate(
        'tax_card_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('TaxCard').countDocuments();
      this.srNumber = count + 1;
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

const TaxCard = mongoose.model('TaxCard', taxCardSchema);
export default TaxCard;
