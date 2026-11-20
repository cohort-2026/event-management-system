import { Router } from 'express';
import {
  getMyPayment,
  listMyPayments,
  processSimulatedPayment,
} from '../controllers/paymentController';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  validateBodyShape,
  validatePaginationQuery,
  validateUuidParam,
} from '../middleware/requestValidation';

const router = Router();
router.param('bookingId', validateUuidParam);

router.get('/', requireAuth, requireRole('ATTENDEE'), validatePaginationQuery, listMyPayments);
router.get('/me', requireAuth, requireRole('ATTENDEE'), validatePaginationQuery, listMyPayments);
router.get('/:bookingId', requireAuth, requireRole('ATTENDEE'), getMyPayment);
router.post(
  '/:bookingId/process',
  requireAuth,
  requireRole('ATTENDEE'),
  validateBodyShape,
  processSimulatedPayment,
);

export default router;
