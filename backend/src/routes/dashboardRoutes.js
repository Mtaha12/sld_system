import express from 'express';
import rateLimit from 'express-rate-limit';
import { getMetrics, getActivities } from '../controllers/dashboardController.js';
import { getPublicDashboard, getAuthenticatedDashboard } from '../controllers/dashboardSummaryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const publicDashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again shortly.' },
});

router.get('/public', publicDashboardLimiter, getPublicDashboard);

router.use(protect);

router.get('/summary', getAuthenticatedDashboard);
router.get('/metrics', getMetrics);
router.get('/activities', getActivities);

export default router;
