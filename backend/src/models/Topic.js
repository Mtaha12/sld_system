import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    srNumber: {
      type: Number,
      index: true,
    },
    heading: {
      type: String,
      required: [true, 'Topic heading is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    viewType: {
      type: String,
      enum: ['', 'file', 'link', 'text'],
      default: '',
    },
    viewData: {
      type: String,
      default: '',
      trim: true,
    },
    viewTitle: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

topicSchema.index({ heading: 'text' });

const Topic = mongoose.model('Topic', topicSchema);

export default Topic;
