import express from 'express';
import { getMetrics, getActivities } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/metrics', getMetrics);
router.get('/activities', getActivities);

export default router;
