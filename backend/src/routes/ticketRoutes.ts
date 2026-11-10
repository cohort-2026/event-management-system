import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET   /api/tickets/me          View own tickets (any authenticated user)
// GET   /api/tickets/:id         View a single ticket (any authenticated user)
// PATCH /api/tickets/:id/checkin Check in a ticket (Organizer on event day)
router.get('/me',               requireAuth, (_req, res) => res.sendStatus(501));
router.get('/:id',              requireAuth, (_req, res) => res.sendStatus(501));
router.patch('/:id/checkin',    requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

export default router;
