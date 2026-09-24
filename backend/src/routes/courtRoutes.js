import express from 'express';
import { getCourts, createCourt, updateCourt, deleteCourt } from '../controllers/courtController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getCourts);
router.post('/', protect, requireAdmin, createCourt);
router.put('/:id', protect, requireAdmin, updateCourt);
router.delete('/:id', protect, requireAdmin, deleteCourt);

export default router;
