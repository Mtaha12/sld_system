import express from 'express';
import { 
  getCases, getCaseById, createCase, 
  updateCase, deleteCase, deleteMultiple,
  searchCases, getMaxPage
} from '../controllers/caseController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All case actions require the user to be logged in
router.use(protect);

// Read-only actions (Accessible to both standard Users and Administrators)
router.get('/', getCases);
router.post('/search', searchCases);
router.get('/max-page', getMaxPage);   // must be before /:id
router.get('/:id', getCaseById);

// Write/Edit actions (Restricted strictly to Administrators)
router.post('/', requireAdmin, createCase);
router.put('/:id', requireAdmin, updateCase);
router.delete('/:id', requireAdmin, deleteCase);
router.post('/delete-multiple', requireAdmin, deleteMultiple);

export default router;
