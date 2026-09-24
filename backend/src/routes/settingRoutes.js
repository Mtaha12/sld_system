import express from 'express';
import {
  getCities,
  createCity,
  updateCity,
  deleteCity,
  getPrinciples,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  getLaws,
  createLaw,
  updateLaw,
  deleteLaw,
  swapLawOrdering,
} from '../controllers/settingController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==============================
// 1. CITIES ROUTES
// ==============================
// Public GET so Signup form can fetch active cities
router.get('/cities', getCities);
router.post('/cities', protect, requireAdmin, createCity);
router.put('/cities/:id', protect, requireAdmin, updateCity);
router.delete('/cities/:id', protect, requireAdmin, deleteCity);

// ==============================
// 2. PRINCIPLE OF LAWS ROUTES
// ==============================
router.get('/principles', getPrinciples);
router.post('/principles', protect, requireAdmin, createPrinciple);
router.put('/principles/:id', protect, requireAdmin, updatePrinciple);
router.delete('/principles/:id', protect, requireAdmin, deletePrinciple);

// ==============================
// 3. LAWS / STATUTES ROUTES
// ==============================
router.get('/laws', getLaws);
router.post('/laws/swap', protect, requireAdmin, swapLawOrdering);
router.post('/laws', protect, requireAdmin, createLaw);
router.put('/laws/:id', protect, requireAdmin, updateLaw);
router.delete('/laws/:id', protect, requireAdmin, deleteLaw);

export default router;
