import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const invoiceItemSchema = new mongoose.Schema({
  srNumber: { type: Number, default: 1 },
  details: { type: String, default: '', trim: true },
  qty: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  invoice_id: {
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
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  name: {
    type: String,
    default: '',
    trim: true,
  },
  address: {
    type: String,
    default: '',
    trim: true,
  },
  items: {
    type: [invoiceItemSchema],
    default: [],
  },
  totalBillAmount: {
    type: Number,
    default: 0,
  },
  deductionPercent: {
    type: Number,
    default: 0,
  },
  deductionAmount: {
    type: Number,
    default: 0,
  },
  totalReceivable: {
    type: Number,
    default: 0,
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

invoiceSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'invoice',
  prefix: 'INV',
  field: 'invoiceId',
  aliases: ['invoice_id']
});

invoiceSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'invoice_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('Invoice').countDocuments();
      this.srNumber = count + 1;
    }
  }

  // Ensure calculations are accurate and consistent on server
  if (Array.isArray(this.items)) {
    let bill = 0;
    this.items.forEach((item, index) => {
      item.srNumber = item.srNumber || (index + 1);
      const q = Number(item.qty) || 0;
      const r = Number(item.rate) || 0;
      item.total = q * r;
      bill += item.total;
    });
    this.totalBillAmount = bill;
    const dedPercent = Number(this.deductionPercent) || 0;
    this.deductionAmount = Math.round((bill * (dedPercent / 100)) * 100) / 100;
    this.totalReceivable = Math.round((bill - this.deductionAmount) * 100) / 100;
  }
});

invoiceSchema.index({
  invoiceId: 'text',
  name: 'text',
  address: 'text',
});

invoiceSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
