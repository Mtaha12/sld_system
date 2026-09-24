import mongoose from 'mongoose';

const magazineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Magazine name is required'],
      trim: true,
      unique: true,
    },
    ordering: {
      type: Number,
      default: 1,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'Active', 'Inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Magazine = mongoose.model('Magazine', magazineSchema);

export default Magazine;
