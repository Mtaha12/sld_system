import express from 'express';
import { 
  register, verifyEmail, resendVerificationCode, login, 
  forgotPassword, getResetPasswordForm, resetPassword, 
  googleLogin, googleSignup, getMe, updateProfile, 
  updateAvatar, removeAvatar, refreshToken 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes (Rate limited to avoid brute-forcing)
router.post('/signup', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-code', authLimiter, resendVerificationCode);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.get('/reset-password', getResetPasswordForm); // HTML reset page
router.post('/reset-password', authLimiter, resetPassword); // Form POST submission
router.post('/google/login', googleLogin);
router.post('/google/signup', googleSignup);
router.post('/refresh-token', refreshToken);

// Protected routes (Require JWT login sessions)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, updateAvatar);
router.delete('/avatar', protect, removeAvatar);

// Mock logout endpoint (Frontend invalidates tokens locally)
router.post('/logout', protect, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
});

export default router;
