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
  getLegalMaxims,
  createLegalMaxim,
  updateLegalMaxim,
  deleteLegalMaxim,
  getLaws,
  createLaw,
  updateLaw,
  deleteLaw,
  swapLawOrdering,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  swapSectionOrdering,
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getWordsPhrases,
  createWordPhrase,
  updateWordPhrase,
  deleteWordPhrase,
  getLegalTerms,
  createLegalTerm,
  updateLegalTerm,
  deleteLegalTerm,
} from '../controllers/settingController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==============================
// 1. CITIES ROUTES
// ==============================
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
// 3. LEGAL MAXIMS ROUTES
// ==============================
router.get('/legal-maxims', getLegalMaxims);
router.post('/legal-maxims', protect, requireAdmin, createLegalMaxim);
router.put('/legal-maxims/:id', protect, requireAdmin, updateLegalMaxim);
router.delete('/legal-maxims/:id', protect, requireAdmin, deleteLegalMaxim);

// ==============================
// 4. LAWS / STATUTES ROUTES
// ==============================
router.get('/laws', getLaws);
router.post('/laws/swap', protect, requireAdmin, swapLawOrdering);
router.post('/laws', protect, requireAdmin, createLaw);
router.put('/laws/:id', protect, requireAdmin, updateLaw);
router.delete('/laws/:id', protect, requireAdmin, deleteLaw);

// ==============================
// 5. SECTIONS ROUTES
// ==============================
router.get('/sections', getSections);
router.post('/sections/swap', protect, requireAdmin, swapSectionOrdering);
router.post('/sections', protect, requireAdmin, createSection);
router.put('/sections/:id', protect, requireAdmin, updateSection);
router.delete('/sections/:id', protect, requireAdmin, deleteSection);

// ==============================
// 6. ARTICLES ROUTES
// ==============================
router.get('/articles', getArticles);
router.post('/articles', protect, requireAdmin, createArticle);
router.put('/articles/:id', protect, requireAdmin, updateArticle);
router.delete('/articles/:id', protect, requireAdmin, deleteArticle);

// ==============================
// 7. TOPICS ROUTES
// ==============================
router.get('/topics', getTopics);
router.post('/topics', protect, requireAdmin, createTopic);
router.put('/topics/:id', protect, requireAdmin, updateTopic);
router.delete('/topics/:id', protect, requireAdmin, deleteTopic);

// ==============================
// 8. WORDS & PHRASES ROUTES
// ==============================
router.get('/words-phrases', getWordsPhrases);
router.post('/words-phrases', protect, requireAdmin, createWordPhrase);
router.put('/words-phrases/:id', protect, requireAdmin, updateWordPhrase);
router.delete('/words-phrases/:id', protect, requireAdmin, deleteWordPhrase);

// ==============================
// 9. LEGAL TERMS ROUTES
// ==============================
router.get('/legal-terms', getLegalTerms);
router.post('/legal-terms', protect, requireAdmin, createLegalTerm);
router.put('/legal-terms/:id', protect, requireAdmin, updateLegalTerm);
router.delete('/legal-terms/:id', protect, requireAdmin, deleteLegalTerm);

export default router;
