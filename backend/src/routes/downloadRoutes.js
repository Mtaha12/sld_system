import express from 'express';
import {
  getDownloads,
  getDownloadById,
  createDownload,
  updateDownload,
  deleteDownload
} from '../controllers/downloadController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getDownloads);
router.get('/:id', getDownloadById);

router.post('/', requireAdmin, createDownload);
router.put('/:id', requireAdmin, updateDownload);
router.delete('/:id', requireAdmin, deleteDownload);

export default router;
