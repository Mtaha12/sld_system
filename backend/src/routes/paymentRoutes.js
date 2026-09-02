import express from 'express';
import {
  getPaymentInstructions,
  getPaymentStatus,
  uploadPaymentProof,
  viewPaymentProof,
  getReviewTokenData,
  approveSubmission,
  rejectSubmission
} from '../controllers/paymentController.js';
import { uploadPaymentProofMiddleware } from '../middleware/uploadMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Dynamic Payment Details & Status
router.get('/instructions', getPaymentInstructions);
router.get('/status', getPaymentStatus);

// Payment proof submission (10MB upload with rate limiter)
router.post('/upload', authLimiter, uploadPaymentProofMiddleware, uploadPaymentProof);

// Secure proof inline view route
router.get('/proof/:token', viewPaymentProof);

// Token-based Review routes for System Owner
router.get('/review/token-info/:token', getReviewTokenData);
router.post('/review/approve/:token', approveSubmission);
router.post('/review/reject/:token', rejectSubmission);

export default router;
