import express from 'express';
import { 
  getNews, 
  getNewsById, 
  createNews, 
  updateNews, 
  deleteNews 
} from '../controllers/newsController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getNews);
router.get('/:id', getNewsById);

router.post('/', requireAdmin, createNews);
router.put('/:id', requireAdmin, updateNews);
router.delete('/:id', requireAdmin, deleteNews);

export default router;
