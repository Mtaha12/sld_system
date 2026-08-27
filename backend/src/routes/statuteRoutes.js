import express from 'express';
import { 
  getStatutes, getStatuteById, createStatute, 
  updateStatute, deleteStatute 
} from '../controllers/statuteController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getStatutes);
router.get('/:id', getStatuteById);

router.post('/', requireAdmin, createStatute);
router.put('/:id', requireAdmin, updateStatute);
router.delete('/:id', requireAdmin, deleteStatute);

export default router;
