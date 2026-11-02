import express from 'express';
import { 
  getStatutes, getStatuteById, getNextStatuteSr, createStatute, 
  updateStatute, deleteStatute, getDistinctLaws, updateLawDate,
  getLatestStatuteMeta
} from '../controllers/statuteController.js';
import { protect, requireAdmin, checkStatuteAccess, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Search / Prefill endpoints (optional protect so search and dropdown work reliably)
router.get('/laws', optionalProtect, getDistinctLaws);
router.get('/latest-meta', optionalProtect, getLatestStatuteMeta);
router.get('/next-sr', optionalProtect, getNextStatuteSr);
router.get('/', optionalProtect, getStatutes);
router.get('/:id', optionalProtect, getStatuteById);

// Admin-managed sequential SR and Date update
router.post('/update-law-date', protect, requireAdmin, updateLawDate);

// Write/Edit actions (Restricted strictly to Administrators)
router.post('/', protect, requireAdmin, createStatute);
router.put('/:id', protect, requireAdmin, updateStatute);
router.delete('/:id', protect, requireAdmin, deleteStatute);

export default router;
