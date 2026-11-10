import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// POST  /api/bookings              Create a booking (attendees only)
// GET   /api/bookings/me           View own bookings
// PATCH /api/bookings/:id/cancel   Cancel own booking
router.post('/',              requireAuth, requireRole('ATTENDEE'), (_req, res) => res.sendStatus(501));
router.get('/me',             requireAuth, (_req, res) => res.sendStatus(501));
router.patch('/:id/cancel',   requireAuth, requireRole('ATTENDEE'), (_req, res) => res.sendStatus(501));

export default router;
