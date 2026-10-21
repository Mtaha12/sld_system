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
  caseNoLink: {
    type: String,
    default: '',
    trim: true,
  },
  caseYear: {
    type: Number,
    index: true,
  },
  parties: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  caseTitle: {
    type: String,
    default: '',
    trim: true,
  },
  orderDate: {
    type: String,
    default: '',
    trim: true,
  },
  judgmentDate: {
    type: String,
    default: '',
    trim: true,
  },
  headNotes: {
    type: String,
    default: '',
    trim: true,
  },
  bench: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  authorJudge: {
    type: String,
    default: '',
    trim: true,
  },
  apexCourt: {
    type: String,
    default: '',
    trim: true,
  },
  apexStatus: {
    type: String,
    default: '',
    trim: true,
  },
  downloadLink: {
    type: String,
    default: '',
    trim: true,
  },
  orderPriority: {
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

otherCaseLawSchema.index({ isDeleted: 1, citation: 1 });
otherCaseLawSchema.index({ isDeleted: 1, caseNo: 1 });
otherCaseLawSchema.index({ isDeleted: 1, otherCaseId: 1 });
otherCaseLawSchema.index({ isDeleted: 1, parties: 1 });
otherCaseLawSchema.index({ isDeleted: 1, bench: 1 });
otherCaseLawSchema.index({ isDeleted: 1, srNumber: -1 });
otherCaseLawSchema.index({ isDeleted: 1, caseYear: -1, srNumber: -1 });
otherCaseLawSchema.index({ isDeleted: 1, updatedAt: -1 });

otherCaseLawSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});


const OtherCaseLaw = mongoose.model('OtherCaseLaw', otherCaseLawSchema);
export default OtherCaseLaw;
