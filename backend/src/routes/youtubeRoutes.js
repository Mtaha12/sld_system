import express from 'express';
import {
  getYoutubeUpdates,
  getYoutubeUpdateById,
  createYoutubeUpdate,
  updateYoutubeUpdate,
  deleteYoutubeUpdate
} from '../controllers/youtubeController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getYoutubeUpdates);
router.get('/:id', getYoutubeUpdateById);

router.post('/', requireAdmin, createYoutubeUpdate);
router.put('/:id', requireAdmin, updateYoutubeUpdate);
router.delete('/:id', requireAdmin, deleteYoutubeUpdate);

export default router;
