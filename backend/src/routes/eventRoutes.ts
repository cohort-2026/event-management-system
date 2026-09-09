import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// GET  /api/events          Browse published events (no auth required)
// GET  /api/events/:id      View event details (no auth required)
router.get('/', (_req, res) => res.sendStatus(501));
router.get('/:id', (_req, res) => res.sendStatus(501));

// ── Organizer ─────────────────────────────────────────────────────────────────
// POST   /api/events                    Create a draft event
// PUT    /api/events/:id                Edit own event
// PATCH  /api/events/:id/submit         Submit own event for approval
// PATCH  /api/events/:id/cancel         Cancel own event
// DELETE /api/events/:id                Delete own draft event
// GET    /api/events/:id/bookings        View registrations for own event
// GET    /api/events/:id/vendors         View vendor applications for own event
router.post('/',                requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.put('/:id',              requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.patch('/:id/submit',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.patch('/:id/cancel',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.delete('/:id',           requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/bookings',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/vendors',      requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

// ── Admin ─────────────────────────────────────────────────────────────────────
// PATCH  /api/events/:id/approve        Approve a pending event
// PATCH  /api/events/:id/reject         Reject a pending event
router.patch('/:id/approve',    requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));
router.patch('/:id/reject',     requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));

export default router;
