import express from 'express';
import {
  getDictionary,
  getDictionaryById,
  createDictionary,
  updateDictionary,
  deleteDictionary
} from '../controllers/dictionaryController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getDictionary);
router.get('/:id', getDictionaryById);

router.post('/', requireAdmin, createDictionary);
router.put('/:id', requireAdmin, updateDictionary);
router.delete('/:id', requireAdmin, deleteDictionary);

export default router;
