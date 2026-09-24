import express from 'express';
import { getMagazines, createMagazine, updateMagazine, deleteMagazine } from '../controllers/magazineController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getMagazines);
router.post('/', protect, requireAdmin, createMagazine);
router.put('/:id', protect, requireAdmin, updateMagazine);
router.delete('/:id', protect, requireAdmin, deleteMagazine);

export default router;
