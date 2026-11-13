import { Router } from 'express';
import { requireApprovedOrganizerProfile, requireAuth, requireRole } from '../middleware/auth';
import { checkInTicket, getTicket, listMyTickets } from '../controllers/ticketController';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

// GET   /api/tickets/me          View own tickets (any authenticated user)
// GET   /api/tickets/:id         View a single ticket (any authenticated user)
// PATCH /api/tickets/:id/checkin Check in a ticket (Organizer on event day)
router.get('/me',               requireAuth, listMyTickets);
router.get('/:id',              requireAuth, getTicket);
router.patch('/:id/checkin',    requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, checkInTicket);

export default router;
