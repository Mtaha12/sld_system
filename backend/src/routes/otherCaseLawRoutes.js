import express from 'express';
import {
  getOtherCaseLaws,
  getNextOtherCaseSr,
  getOtherCaseLawById,
  createOtherCaseLaw,
  updateOtherCaseLaw,
  deleteOtherCaseLaw,
  viewOtherCaseDocument
} from '../controllers/otherCaseLawController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / inline document stream for new tab viewing without download
router.get('/view-document', viewOtherCaseDocument);

router.use(protect);

router.get('/', getOtherCaseLaws);
router.get('/next-sr', getNextOtherCaseSr);
router.get('/:id', getOtherCaseLawById);

router.post('/', requireAdmin, createOtherCaseLaw);
router.put('/:id', requireAdmin, updateOtherCaseLaw);
router.delete('/:id', requireAdmin, deleteOtherCaseLaw);

export default router;
