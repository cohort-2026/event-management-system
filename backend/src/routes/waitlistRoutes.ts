import { Router } from 'express';
import { claimWaitlistOfferController, createWaitlistEntry, getWaitlistEntry, leaveWaitlist, listMyWaitlistOffers, listMyWaitlists } from '../controllers/waitlistController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBodyShape, validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);
router.post('/', requireAuth, requireRole('ATTENDEE'), validateBodyShape, createWaitlistEntry);
router.get('/my', requireAuth, requireRole('ATTENDEE'), listMyWaitlists);
router.get('/offers/my', requireAuth, requireRole('ATTENDEE'), listMyWaitlistOffers);
router.post('/:id/claim', requireAuth, requireRole('ATTENDEE'), claimWaitlistOfferController);
router.get('/:id', requireAuth, getWaitlistEntry);
router.delete('/:id', requireAuth, requireRole('ATTENDEE'), leaveWaitlist);
export default router;
