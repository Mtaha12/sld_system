import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import {
  createSession,
  getUserSessions,
  getSessionById,
  sendMessage,
  queryLegalCore,
  clearSession
} from '../controllers/aiChatController.js';

const router = express.Router();

// All AI chat routes require authentication
router.use(protect);

router.post('/query', chatLimiter, queryLegalCore);
router.post('/sessions', createSession);
router.get('/sessions', getUserSessions);
router.get('/sessions/:sessionId', getSessionById);
router.post('/sessions/:sessionId/messages', chatLimiter, sendMessage);
router.post('/sessions/:sessionId/clear', clearSession);

export default router;
