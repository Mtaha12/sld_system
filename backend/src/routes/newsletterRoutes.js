import express from 'express';
import {
  getNewsletters,
  getNewsletterById,
  createNewsletter,
  updateNewsletter,
  deleteNewsletter
} from '../controllers/newsletterController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getNewsletters);
router.get('/:id', getNewsletterById);

router.post('/', requireAdmin, createNewsletter);
router.put('/:id', requireAdmin, updateNewsletter);
router.delete('/:id', requireAdmin, deleteNewsletter);

export default router;
