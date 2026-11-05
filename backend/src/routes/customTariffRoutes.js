import express from 'express';
import {
  getCustomTariffs,
  getNextCustomTariffSld,
  getCustomTariffById,
  createCustomTariff,
  updateCustomTariff,
  deleteCustomTariff
} from '../controllers/customTariffController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getCustomTariffs);
router.get('/next-sld', getNextCustomTariffSld);
router.get('/:id', getCustomTariffById);

router.post('/', requireAdmin, createCustomTariff);
router.put('/:id', requireAdmin, updateCustomTariff);
router.delete('/:id', requireAdmin, deleteCustomTariff);

export default router;
