import { Prisma, PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';
import {
  approveEvent,
  cancelEvent,
  createEvent,
  getAdminEventAnalytics,
  getPublicEvent,
  getManagedEvent,
  listEventsForApproval,
  listMyEvents,
  listPublicEvents,
  rejectEvent,
  submitEventForApproval,
  updateEvent,
} from '@/controllers/eventController';

const router = Router();
const prisma = new PrismaClient();
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

// ── Public ────────────────────────────────────────────────────────────────────
// GET  /api/events          Browse published events (no auth required)
// GET  /api/events/:id      View event details (no auth required)
router.get('/', listPublicEvents);
router.get('/mine', requireAuth, requireRole('ORGANIZER'), listMyEvents);
router.get('/admin/approval-queue', requireAuth, requireRole('ADMIN'), listEventsForApproval);
router.get('/admin/analytics', requireAuth, requireRole('ADMIN'), getAdminEventAnalytics);
router.get('/:id/manage', requireAuth, requireRole('ORGANIZER'), getManagedEvent);
router.get('/:id', getPublicEvent);

// ── Organizer ─────────────────────────────────────────────────────────────────
// POST   /api/events                    Create a draft event
// PUT    /api/events/:id                Edit own event
// PATCH  /api/events/:id/submit         Submit own event for approval
// PATCH  /api/events/:id/cancel         Cancel own event
// DELETE /api/events/:id                Delete own draft event
// GET    /api/events/:id/bookings        View registrations for own event
// GET    /api/events/:id/vendors         View vendor applications for own event
router.post('/',                requireAuth, requireRole('ORGANIZER'), createEvent);
router.put('/:id',              requireAuth, requireRole('ORGANIZER'), updateEvent);
router.patch('/:id/submit',     requireAuth, requireRole('ORGANIZER'), submitEventForApproval);
router.patch('/:id/cancel',     requireAuth, requireRole('ORGANIZER'), cancelEvent);
router.delete('/:id',           requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/bookings',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/vendors',      requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

// ── Admin ─────────────────────────────────────────────────────────────────────
// PATCH  /api/events/:id/approve        Approve a pending event
// PATCH  /api/events/:id/reject         Reject a pending event
router.patch('/:id/approve',    requireAuth, requireRole('ADMIN'), approveEvent);
router.patch('/:id/reject',     requireAuth, requireRole('ADMIN'), rejectEvent);

export default router;
