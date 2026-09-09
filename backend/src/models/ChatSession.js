import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  // Structured metadata returned by the legal engine
  legalAnalysis: {
    matchedCase: {
      id: String,
      sldNumber: String,
      caseId: String,
      court: String,
      dated: String,
      caseNumber: [String],
      judges: [String],
      petitioners: [String],
      lawyers: [String],
      mapYearPage: [String],
      principleLaw: String,
      laws: [{ lawStatute: String, section: String }],
    },
    exactQuote: {
      matchedLine: String,
      surroundingContext: String,
      sourceField: String, // 'judgment' or 'headNote'
    },
    matchType: String, // 'exact_judgment_line', 'citation', 'statute', 'topic', 'general'
    confidence: Number, // percentage, e.g. 98
    activeReferences: [String], // ['judgments', 'citations', 'statutes', 'headnotes', etc.]
    sourcesFound: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Legal Research',
  },
  sldNumber: {
    type: String,
    default: null,
  },
  messages: {
    type: [messageSchema],
    default: [],
  },
  isArchived: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
