import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const whatsappUpdateSchema = new mongoose.Schema({
  whatsappId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  whatsapp_id: {
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

whatsappUpdateSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'whatsapp',
  prefix: 'WA',
  field: 'whatsappId',
  aliases: ['whatsapp_id']
});

whatsappUpdateSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'whatsapp_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('WhatsappUpdate').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

whatsappUpdateSchema.index({
  whatsappId: 'text',
  heading: 'text',
});
whatsappUpdateSchema.index({ isDeleted: 1, srNumber: -1, createdAt: -1 });
whatsappUpdateSchema.index({ isDeleted: 1, dated: -1 });

whatsappUpdateSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const WhatsappUpdate = mongoose.model('WhatsappUpdate', whatsappUpdateSchema);
export default WhatsappUpdate;
