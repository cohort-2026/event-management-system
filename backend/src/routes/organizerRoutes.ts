import { Router } from 'express';
import { getOrganizerProfile, updateOrganizerProfile } from '../controllers/organizerProfileController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/profile', requireAuth, requireRole('ORGANIZER'), getOrganizerProfile);
router.put('/profile', requireAuth, requireRole('ORGANIZER'), updateOrganizerProfile);

export default router;
