import mongoose from 'mongoose';
import autoUniqueIdPlugin from '../utils/autoUniqueIdPlugin.js';
import Counter from './Counter.js';

const otherCaseLawSchema = new mongoose.Schema({
  otherCaseId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  other_case_id: {
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
  citation: {
    type: String,
    default: '',
    trim: true,
  },
  scCitation: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  caseNo: {
    type: String,
    required: [true, 'Case No is required'],
    trim: true,
    index: true,
  },
  caseTitle: {
    type: String,
    required: [true, 'Case Title is required'],
    trim: true,
  },
  judgmentDate: {
    type: String,
    required: [true, 'Judgment Date is required'],
    trim: true,
  },
  orderPriority: {
    type: String,
    default: '',
    trim: true,
  },
  authorJudge: {
    type: String,
    default: '',
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
  attachmentSize: {
    type: String,
    default: '',
  },
  notes: {
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

otherCaseLawSchema.plugin(autoUniqueIdPlugin, {
  entityName: 'othercaselaw',
  prefix: 'OCL',
  field: 'otherCaseId',
  aliases: ['other_case_id']
});

otherCaseLawSchema.pre('save', async function () {
  if (this.isNew && !this.srNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'other_case_sr_seq',
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      this.srNumber = counter.seq;
    } catch {
      const count = await mongoose.model('OtherCaseLaw').countDocuments();
      this.srNumber = count + 1;
    }
  }
});

otherCaseLawSchema.index({
  otherCaseId: 'text',
  caseNo: 'text',
  caseTitle: 'text',
  scCitation: 'text',
  citation: 'text',
  authorJudge: 'text',
});

otherCaseLawSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const OtherCaseLaw = mongoose.model('OtherCaseLaw', otherCaseLawSchema);
export default OtherCaseLaw;
