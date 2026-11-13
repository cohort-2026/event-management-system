import { Router } from 'express';
import {
  register,
  login,
  logout,
  me,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  completeOrganizerPasswordSetup,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { loginLimiter, otpLimiter, registrationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register',             registrationLimiter, register);
router.post('/verify-email',         otpLimiter, verifyEmail);
router.post('/resend-verification',  otpLimiter, resendVerificationEmail);
router.post('/forgot-password',      otpLimiter, requestPasswordReset);
router.post('/reset-password',       otpLimiter, resetPassword);
router.post('/setup-organizer-password', otpLimiter, completeOrganizerPasswordSetup);
router.post('/change-password',      requireAuth, changePassword);
router.post('/login',                loginLimiter, login);
router.post('/logout',               logout);
router.get('/me',                    requireAuth, me);

export default router;
