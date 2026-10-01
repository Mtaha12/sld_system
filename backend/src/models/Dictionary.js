import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const dictionarySchema = new mongoose.Schema({
  dictionaryId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  dictionary_id: {
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
  words: {
    type: String,
    required: [true, 'Words is required'],
    trim: true,
    index: true,
  },
  meaning: {
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

dictionarySchema.plugin(autoUniqueIdPlugin, {
  entityName: 'dictionary',
  prefix: 'DICT',
  field: 'dictionaryId',
  aliases: ['dictionary_id']
});

dictionarySchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'dictionary_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('Dictionary').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

dictionarySchema.index({
  dictionaryId: 'text',
  words: 'text',
  meaning: 'text',
});
dictionarySchema.index({ isDeleted: 1, words: 1 });
dictionarySchema.index({ isDeleted: 1, srNumber: -1 });

dictionarySchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Dictionary = mongoose.model('Dictionary', dictionarySchema);
export default Dictionary;
