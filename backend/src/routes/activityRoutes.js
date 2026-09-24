import express from 'express';
import { getActivities, logActivity } from '../controllers/activityController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public/authenticated endpoint to log activities
router.post('/log', logActivity);

// Viewing activities requires administrator
router.get('/', protect, requireAdmin, getActivities);

export default router;
