import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const websiteUpdateSchema = new mongoose.Schema({
  updateId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  update_id: {
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
  dated: {
    type: String,
    required: [true, 'Dated is required'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
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

websiteUpdateSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'update',
  prefix: 'UPD',
  field: 'updateId',
  aliases: ['update_id']
});

websiteUpdateSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'update_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('WebsiteUpdate').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

websiteUpdateSchema.index({
  updateId: 'text',
  heading: 'text',
  url: 'text',
});

websiteUpdateSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const WebsiteUpdate = mongoose.model('WebsiteUpdate', websiteUpdateSchema);
export default WebsiteUpdate;
