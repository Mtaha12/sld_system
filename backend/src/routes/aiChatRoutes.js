import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import {
  createSession,
  getUserSessions,
  getSessionById,
  sendMessage,
  queryLegalCore,
  clearSession,
  getAdminAiChatLogs,
  getAdminAiChatStats,
  deleteAdminAiChatLog,
  clearAdminAiChatLogs
} from '../controllers/aiChatController.js';

const router = express.Router();

// All AI chat routes require authentication
router.use(protect);

// User Chat Endpoints
router.post('/query', chatLimiter, queryLegalCore);
router.post('/sessions', createSession);
router.get('/sessions', getUserSessions);
router.get('/sessions/:sessionId', getSessionById);
router.post('/sessions/:sessionId/messages', chatLimiter, sendMessage);
router.post('/sessions/:sessionId/clear', clearSession);

// Admin AI Chat Audit & History Endpoints
router.get('/admin/logs', requireAdmin, getAdminAiChatLogs);
router.get('/admin/stats', requireAdmin, getAdminAiChatStats);
router.delete('/admin/logs/:id', requireAdmin, deleteAdminAiChatLog);
router.delete('/admin/logs', requireAdmin, clearAdminAiChatLogs);

export default router;
