import express from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleSpammer,
  changeUserPassword,
  forceLogoutUser
} from '../controllers/userController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user management routes require admin rights
router.use(protect, requireAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.patch('/:id/password', changeUserPassword);
router.put('/:id/password', changeUserPassword);
router.delete('/:id', deleteUser);
router.patch('/:id/spammer', toggleSpammer);
router.post('/:id/force-logout', forceLogoutUser);
router.post('/:id/logout', forceLogoutUser);

export default router;
