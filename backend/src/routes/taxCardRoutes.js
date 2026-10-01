import express from 'express';
import {
  getTaxCards,
  getTaxCardById,
  createTaxCard,
  updateTaxCard,
  deleteTaxCard
} from '../controllers/taxCardController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getTaxCards);
router.get('/:id', getTaxCardById);

router.post('/', requireAdmin, createTaxCard);
router.put('/:id', requireAdmin, updateTaxCard);
router.delete('/:id', requireAdmin, deleteTaxCard);

export default router;
