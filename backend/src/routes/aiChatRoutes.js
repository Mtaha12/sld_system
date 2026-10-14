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

// All AI chat routes require authentication
router.use(protect);

router.post('/query', queryLegalCore);
router.post('/sessions', createSession);
router.get('/sessions', getUserSessions);
router.get('/sessions/:sessionId', getSessionById);
router.post('/sessions/:sessionId/messages', sendMessage);
router.post('/sessions/:sessionId/clear', clearSession);

export default router;
