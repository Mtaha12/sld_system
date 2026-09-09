import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createSession,
  getUserSessions,
  getSessionById,
  sendMessage,
  queryLegalCore,
  clearSession
} from '../controllers/aiChatController.js';

const router = express.Router();

// Direct legal query endpoint (open for AI search and testing)
router.post('/query', queryLegalCore);

// Session endpoints require authentication
router.use(protect);

router.post('/sessions', createSession);
router.get('/sessions', getUserSessions);
router.get('/sessions/:sessionId', getSessionById);
router.post('/sessions/:sessionId/messages', sendMessage);
router.post('/sessions/:sessionId/clear', clearSession);

export default router;
