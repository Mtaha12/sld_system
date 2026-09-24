import express from 'express';
import { 
  getNotifications, getNotificationById, createNotification, 
  updateNotification, deleteNotification 
} from '../controllers/notificationController.js';
import { protect, requireAdmin, checkNotificationAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, checkNotificationAccess);

router.get('/', getNotifications);
router.get('/:id', getNotificationById);

router.post('/', requireAdmin, createNotification);
router.put('/:id', requireAdmin, updateNotification);
router.delete('/:id', requireAdmin, deleteNotification);

export default router;
