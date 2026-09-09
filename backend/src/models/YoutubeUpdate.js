import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const youtubeUpdateSchema = new mongoose.Schema({
  youtubeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  youtube_id: {
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
  caption: {
    type: String,
    required: [true, 'Caption is required'],
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
  photo: {
    type: String,
    default: '',
  },
  photoName: {
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

youtubeUpdateSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'youtube',
  prefix: 'YT',
  field: 'youtubeId',
  aliases: ['youtube_id']
});

youtubeUpdateSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'youtube_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('YoutubeUpdate').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

youtubeUpdateSchema.index({
  youtubeId: 'text',
  caption: 'text',
  url: 'text',
});

youtubeUpdateSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const YoutubeUpdate = mongoose.model('YoutubeUpdate', youtubeUpdateSchema);
export default YoutubeUpdate;
