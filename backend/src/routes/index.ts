import { Router } from 'express';
import authRoutes         from '@/routes/authRoutes';
import eventRoutes        from '@/routes/eventRoutes';
import bookingRoutes      from '@/routes/bookingRoutes';
import vendorRoutes       from '@/routes/vendorRoutes';
import ticketRoutes       from '@/routes/ticketRoutes';
import userRoutes         from '@/routes/userRoutes';
import reportRoutes       from '@/routes/reportRoutes';

const router = Router();

router.use('/auth',      authRoutes);
router.use('/events',    eventRoutes);
router.use('/bookings',  bookingRoutes);
router.use('/vendors',   vendorRoutes);
router.use('/tickets',   ticketRoutes);
router.use('/users',     userRoutes);
router.use('/reports',   reportRoutes);

export default router;
