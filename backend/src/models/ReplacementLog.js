import mongoose from 'mongoose';

const replacementLogSchema = new mongoose.Schema(
  {
    findText: {
      type: String,
      required: [true, 'Find text is required'],
      trim: true,
    },
    replaceWith: {
      type: String,
      default: '',
    },
    fromId: {
      type: String,
      default: '',
      trim: true,
    },
    toId: {
      type: String,
      required: [true, 'To ID is required'],
      trim: true,
    },
    updateFor: {
      type: String,
      required: [true, 'Update For field is required'],
      enum: ['Head Note', 'Judgment', 'Judges', 'Petitioners', 'Case #', 'Laws', 'References'],
      index: true,
    },
    affectedCasesCount: {
      type: Number,
      default: 0,
    },
    executedBy: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    dated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const ReplacementLog = mongoose.model('ReplacementLog', replacementLogSchema);

export default ReplacementLog;
