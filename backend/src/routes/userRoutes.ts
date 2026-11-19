import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { approveOrganizerProfile, createOrganizer, deleteOrganizerAccount, getOrganizer, listOrganizers, rejectOrganizerProfile } from '../controllers/organizerController';
import { activateUser, deactivateUser, getUser, listUsers, updateUserRole } from '../controllers/userController';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

router.get('/organizers',                        requireAuth, requireRole('ADMIN'), listOrganizers);
router.get('/organizers/:id',                    requireAuth, requireRole('ADMIN'), getOrganizer);
router.post('/organizers',                       requireAuth, requireRole('ADMIN'), createOrganizer);
router.patch('/organizers/:id/approve-profile',  requireAuth, requireRole('ADMIN'), approveOrganizerProfile);
router.patch('/organizers/:id/reject-profile',   requireAuth, requireRole('ADMIN'), rejectOrganizerProfile);
router.delete('/organizers/:id',                 requireAuth, requireRole('ADMIN'), deleteOrganizerAccount);

// All user management endpoints are Admin-only
// GET   /api/users                  List all users
// GET   /api/users/:id              Get a single user
// PATCH /api/users/:id/role         Change a user's role
// PATCH /api/users/:id/deactivate   Deactivate a user account
router.get('/',                   requireAuth, requireRole('ADMIN'), listUsers);
router.get('/:id',                requireAuth, requireRole('ADMIN'), getUser);
router.patch('/:id/role',         requireAuth, requireRole('ADMIN'), updateUserRole);
router.patch('/:id/deactivate',   requireAuth, requireRole('ADMIN'), deactivateUser);
router.patch('/:id/activate',     requireAuth, requireRole('ADMIN'), activateUser);

export default router;
