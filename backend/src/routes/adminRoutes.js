import express from 'express';
import { 
  getAdmins, 
  createAdmin, 
  updateAdmin, 
  deleteAdmin, 
  changeAdminPassword 
} from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/', getAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.patch('/:id/password', changeAdminPassword);
router.put('/:id/password', changeAdminPassword);
router.delete('/:id', deleteAdmin);

export default router;
