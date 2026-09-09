import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const downloadItemSchema = new mongoose.Schema({
  downloadId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  download_id: {
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
  latest: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Finance Act', 'Tax Return', 'Updated Law'],
    default: 'Finance Act',
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

downloadItemSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'download',
  prefix: 'DWN',
  field: 'downloadId',
  aliases: ['download_id']
});

downloadItemSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'download_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('DownloadItem').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

downloadItemSchema.index({
  downloadId: 'text',
  heading: 'text',
  latest: 'text',
  detail: 'text',
});

downloadItemSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const DownloadItem = mongoose.model('DownloadItem', downloadItemSchema);
export default DownloadItem;
