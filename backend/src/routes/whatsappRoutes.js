import express from 'express';
import {
  getWhatsappUpdates,
  getNextWhatsappSr,
  getWhatsappUpdateById,
  viewWhatsappAttachment,
  downloadWhatsappAttachment,
  createWhatsappUpdate,
  updateWhatsappUpdate,
  deleteWhatsappUpdate
} from '../controllers/whatsappController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getWhatsappUpdates);
router.get('/next-sr', getNextWhatsappSr);
router.get('/:id/view', viewWhatsappAttachment);
router.get('/:id/download', downloadWhatsappAttachment);
router.get('/:id', getWhatsappUpdateById);

router.post('/', requireAdmin, createWhatsappUpdate);
router.put('/:id', requireAdmin, updateWhatsappUpdate);
router.delete('/:id', requireAdmin, deleteWhatsappUpdate);

export default router;
