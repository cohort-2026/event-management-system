import { Router } from 'express';
import authRoutes         from './authRoutes';
import eventRoutes        from './eventRoutes';
import bookingRoutes      from './bookingRoutes';
import vendorRoutes       from './vendorRoutes';
import ticketRoutes       from './ticketRoutes';
import userRoutes         from './userRoutes';
import organizerRoutes    from './organizerRoutes';
import reportRoutes       from './reportRoutes';
import platformAdminRoutes from './platformAdminRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

router.use('/auth',      authRoutes);
router.use('/events',    eventRoutes);
router.use('/bookings',  bookingRoutes);
router.use('/vendors',   vendorRoutes);
router.use('/tickets',   ticketRoutes);
router.use('/users',     userRoutes);
router.use('/organizer', organizerRoutes);
router.use('/reports',   reportRoutes);
router.use('/platform-admin', platformAdminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
