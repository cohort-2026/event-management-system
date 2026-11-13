import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { cancelBooking, createBooking, listMyBookings } from '../controllers/bookingController';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

// POST  /api/bookings              Create a booking (attendees only)
// GET   /api/bookings/me           View own bookings
// PATCH /api/bookings/:id/cancel   Cancel own booking
router.post('/',              requireAuth, requireRole('ATTENDEE'), createBooking);
router.get('/me',             requireAuth, requireRole('ATTENDEE'), listMyBookings);
router.patch('/:id/cancel',   requireAuth, requireRole('ATTENDEE'), cancelBooking);

export default router;
