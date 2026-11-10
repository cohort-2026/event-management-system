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

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/setup-organizer-password', completeOrganizerPasswordSetup);
router.post('/change-password', requireAuth, changePassword);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
