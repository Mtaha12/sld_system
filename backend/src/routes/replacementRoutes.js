import express from 'express';
import { executeReplacement, getReplacementHistory } from '../controllers/replacementController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, requireAdmin);

router.post('/execute', executeReplacement);
router.get('/history', getReplacementHistory);

export default router;
