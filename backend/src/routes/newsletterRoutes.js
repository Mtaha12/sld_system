import express from 'express';
import {
  getNewsletters,
  getNewsletterById,
  createNewsletter,
  updateNewsletter,
  deleteNewsletter,
  uploadNewsletterAttachment
} from '../controllers/newsletterController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import { uploadNewsletterAttachmentMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes for sharing and viewing newsletter documents by link
router.get('/public/:id', getNewsletterById);
router.get('/view/:id', getNewsletterById);

router.use(protect);

router.get('/', getNewsletters);
router.get('/:id', getNewsletterById);

router.post('/upload-attachment', requireAdmin, uploadNewsletterAttachmentMiddleware, uploadNewsletterAttachment);
router.post('/', requireAdmin, createNewsletter);
router.put('/:id', requireAdmin, updateNewsletter);
router.delete('/:id', requireAdmin, deleteNewsletter);

export default router;
