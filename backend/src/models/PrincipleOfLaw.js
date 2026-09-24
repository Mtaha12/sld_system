import mongoose from 'mongoose';

const principleOfLawSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Principle / Law name is required'],
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

principleOfLawSchema.index({ status: 1 });

const PrincipleOfLaw = mongoose.model('PrincipleOfLaw', principleOfLawSchema);

export default PrincipleOfLaw;
