import express from 'express';
import { 
  getNotifications, getNotificationById, getNextNotificationSr,
  createNotification, updateNotification, deleteNotification,
  uploadNotificationAttachment,
  getNotificationAttachmentStream
} from '../controllers/notificationController.js';
import { protect, requireAdmin, checkNotificationAccess } from '../middleware/authMiddleware.js';
import { uploadReferenceViewMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public inline attachment stream so new browser tabs can view document directly
router.get('/:id/attachment', getNotificationAttachmentStream);

router.use(protect, checkNotificationAccess);

router.get('/next-sr', getNextNotificationSr);
router.get('/', getNotifications);
router.get('/:id', getNotificationById);

router.post('/upload-attachment', requireAdmin, uploadReferenceViewMiddleware, uploadNotificationAttachment);
router.post('/', requireAdmin, createNotification);
router.put('/:id', requireAdmin, updateNotification);
router.delete('/:id', requireAdmin, deleteNotification);

export default router;
