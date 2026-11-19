import { Router } from 'express';
import { requireApprovedOrganizerProfile, requireAuth, requireRole } from '../middleware/auth';
import {
  checkInTicket,
  getTicket,
  listMyTickets,
  scanTicketQr,
} from '../controllers/ticketController';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

// GET   /api/tickets/me          View own tickets
// GET   /api/tickets/:id         View an owned ticket or a ticket for an owned event
// POST  /api/tickets/scan        Verify and check in an opaque QR payload
// PATCH /api/tickets/:id/checkin Check in a ticket by ID
router.get('/me', requireAuth, requireRole('ATTENDEE'), listMyTickets);
router.post('/scan', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, scanTicketQr);
router.get('/:id', requireAuth, requireRole('ATTENDEE', 'ORGANIZER'), getTicket);
router.patch('/:id/checkin', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, checkInTicket);

export default router;
