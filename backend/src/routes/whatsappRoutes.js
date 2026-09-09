import express from 'express';
import {
  getWhatsappUpdates,
  getWhatsappUpdateById,
  createWhatsappUpdate,
  updateWhatsappUpdate,
  deleteWhatsappUpdate
} from '../controllers/whatsappController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getWhatsappUpdates);
router.get('/:id', getWhatsappUpdateById);

router.post('/', requireAdmin, createWhatsappUpdate);
router.put('/:id', requireAdmin, updateWhatsappUpdate);
router.delete('/:id', requireAdmin, deleteWhatsappUpdate);

export default router;
