import express from 'express';
import {
  getUpdates,
  getUpdateById,
  createUpdate,
  updateUpdate,
  deleteUpdate
} from '../controllers/updateController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getUpdates);
router.get('/:id', getUpdateById);

router.post('/', requireAdmin, createUpdate);
router.put('/:id', requireAdmin, updateUpdate);
router.delete('/:id', requireAdmin, deleteUpdate);

export default router;
