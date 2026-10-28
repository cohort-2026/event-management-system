import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';
import { createOrganizer, listOrganizers } from '@/controllers/organizerController';

const router = Router();

router.get('/organizers', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), listOrganizers);
router.post('/organizers', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), createOrganizer);

// All user management endpoints are Admin-only
// GET   /api/users                  List all users
// GET   /api/users/:id              Get a single user
// PATCH /api/users/:id/role         Change a user's role
// PATCH /api/users/:id/deactivate   Deactivate a user account
router.get('/',                   requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), (_req, res) => res.sendStatus(501));
router.get('/:id',                requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), (_req, res) => res.sendStatus(501));
router.patch('/:id/role',         requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));
router.patch('/:id/deactivate',   requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), (_req, res) => res.sendStatus(501));

export default router;
