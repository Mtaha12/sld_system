import express from 'express';
import {
  getOtherCaseLaws,
  getOtherCaseLawById,
  createOtherCaseLaw,
  updateOtherCaseLaw,
  deleteOtherCaseLaw
} from '../controllers/otherCaseLawController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getOtherCaseLaws);
router.get('/:id', getOtherCaseLawById);

router.post('/', requireAdmin, createOtherCaseLaw);
router.put('/:id', requireAdmin, updateOtherCaseLaw);
router.delete('/:id', requireAdmin, deleteOtherCaseLaw);

export default router;
