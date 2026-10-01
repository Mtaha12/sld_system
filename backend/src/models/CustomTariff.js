import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const tariffItemSchema = new mongoose.Schema({
  pctCode: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  uom: { type: String, default: '', trim: true },
  cd: { type: String, default: '', trim: true },
  ad: { type: String, default: '', trim: true },
  rd: { type: String, default: '', trim: true },
  exSth: { type: String, default: '', trim: true },
  con: { type: String, default: '', trim: true },
  st: { type: String, default: '', trim: true },
  wht: { type: String, default: '', trim: true },
  other: { type: String, default: '', trim: true },
  subDetail: { type: String, default: '' },
}, { _id: true });

const customTariffSchema = new mongoose.Schema({
  customTariffId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  custom_tariff_id: {
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
  sldNumber: {
    type: String,
    required: [true, 'SLD # is required'],
    trim: true,
    index: true,
  },
  dated: {
    type: String,
    required: [true, 'Dated is required'],
    trim: true,
  },
  fromYear: {
    type: String,
    required: [true, 'From Year is required'],
    trim: true,
  },
  toYear: {
    type: String,
    required: [true, 'To Year is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    trim: true,
    index: true,
  },
  heading: {
    type: String,
    required: [true, 'Heading is required'],
    trim: true,
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
  items: {
    type: [tariffItemSchema],
    default: [],
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

customTariffSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'customtariff',
  prefix: 'CT',
  field: 'customTariffId',
  aliases: ['custom_tariff_id']
});

customTariffSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'custom_tariff_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('CustomTariff').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

customTariffSchema.index({
  customTariffId: 'text',
  sldNumber: 'text',
  heading: 'text',
  detail: 'text',
});

customTariffSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const CustomTariff = mongoose.model('CustomTariff', customTariffSchema);
export default CustomTariff;
