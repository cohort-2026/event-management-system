import { Router } from 'express';
import authRoutes         from '@/routes/authRoutes';
import eventRoutes        from '@/routes/eventRoutes';
import bookingRoutes      from '@/routes/bookingRoutes';
import vendorRoutes       from '@/routes/vendorRoutes';
import ticketRoutes       from '@/routes/ticketRoutes';
import userRoutes         from '@/routes/userRoutes';
import organizerRoutes    from '@/routes/organizerRoutes';
import reportRoutes       from '@/routes/reportRoutes';
import platformAdminRoutes from '@/routes/platformAdminRoutes';
import notificationRoutes from '@/routes/notificationRoutes';

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
