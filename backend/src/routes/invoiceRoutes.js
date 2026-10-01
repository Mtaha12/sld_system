import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoiceController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

router.post('/', requireAdmin, createInvoice);
router.put('/:id', requireAdmin, updateInvoice);
router.delete('/:id', requireAdmin, deleteInvoice);

export default router;
