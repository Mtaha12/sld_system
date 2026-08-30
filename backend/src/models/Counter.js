import mongoose from 'mongoose';

/**
 * Counter schema for atomic sequence generation
 * Concurrency safety is guaranteed by MongoDB's atomic findOneAndUpdate with $inc
 */
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    trim: true,
    description: 'Unique sequence identifier (e.g., case, notification, statute, user, record)'
  },
  seq: {
    type: Number,
    default: 0,
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
