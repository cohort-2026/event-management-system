import { Router } from 'express';
import { requireApprovedOrganizerProfile, requireAuth, requireRole } from '../middleware/auth';
import { uploadEventBanner } from '../controllers/eventBannerController';
import { parseEventBanner } from '../middleware/eventBannerUpload';
import {
  cancelEvent,
  completeEvent,
  createEvent,
  deleteEvent,
  getAdminEventAnalytics,
  getPublicEvent,
  getManagedEvent,
  listEventBookings,
  listVendorApplicationsForEvent,
  listMyEvents,
  listPublicEvents,
  publishEvent,
  updateEvent,
} from '../controllers/eventController';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

// ── Public ────────────────────────────────────────────────────────────────────
// GET  /api/events          Browse published events (no auth required)
// GET  /api/events/:id      View event details (no auth required)
router.get('/', listPublicEvents);
router.get('/mine', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, listMyEvents);
router.get('/admin/analytics', requireAuth, requireRole('ADMIN'), getAdminEventAnalytics);
router.get('/:id/manage', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, getManagedEvent);
router.get('/:id', getPublicEvent);

// ── Organizer ─────────────────────────────────────────────────────────────────
router.post('/banner-image', requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, parseEventBanner, uploadEventBanner);
// POST   /api/events                    Create a draft event
// PUT    /api/events/:id                Edit own event
// PATCH   /api/events/:id/publish        Publish own event without admin approval
// PATCH  /api/events/:id/cancel         Cancel own event
// DELETE /api/events/:id                Delete own draft event
// GET    /api/events/:id/bookings        View registrations for own event
// GET    /api/events/:id/vendors         View vendor applications for own event
router.post('/',                requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, createEvent);
router.put('/:id',              requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, updateEvent);
router.patch('/:id/publish',    requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, publishEvent);
router.patch('/:id/cancel',     requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, cancelEvent);
router.patch('/:id/complete',   requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, completeEvent);
router.delete('/:id',           requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, deleteEvent);
router.get('/:id/bookings',     requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, listEventBookings);
router.get('/:id/vendors',      requireAuth, requireRole('ORGANIZER'), requireApprovedOrganizerProfile, listVendorApplicationsForEvent);

export default router;
