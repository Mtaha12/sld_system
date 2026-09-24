import express from 'express';
import { getIpBlocks, createIpBlock, deleteIpBlock } from '../controllers/ipBlockController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/', getIpBlocks);
router.post('/', createIpBlock);
router.delete('/:id', deleteIpBlock);

export default router;
