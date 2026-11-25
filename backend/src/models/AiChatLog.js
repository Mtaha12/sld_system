import mongoose from 'mongoose';

const aiChatLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userName: {
    type: String,
    default: 'Anonymous / Guest'
  },
  userLogin: {
    type: String,
    default: 'N/A'
  },
  userEmail: {
    type: String,
    default: 'N/A',
    index: true
  },
  userAgency: {
    type: String,
    default: 'General'
  },
  userCity: {
    type: String,
    default: 'N/A'
  },
  userRole: {
    type: String,
    default: 'User'
  },
  ipAddress: {
    type: String,
    default: ''
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession'
  },
  question: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  attachments: [{
    name: String,
    type: { type: String },
    size: Number
  }],
  legalAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

aiChatLogSchema.index({ createdAt: -1 });
aiChatLogSchema.index({ user: 1, createdAt: -1 });
aiChatLogSchema.index({ userName: 'text', userEmail: 'text', question: 'text', response: 'text' });

const AiChatLog = mongoose.model('AiChatLog', aiChatLogSchema);
export default AiChatLog;
