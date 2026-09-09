import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';

const router = Router();

// POST  /api/vendors/apply            Submit a vendor stand application
// GET   /api/vendors/me               View own applications
// POST  /api/vendors/:id/staff        Add staff to an approved application
router.post('/apply',           requireAuth, requireRole('VENDOR'), (_req, res) => res.sendStatus(501));
router.get('/me',               requireAuth, requireRole('VENDOR'), (_req, res) => res.sendStatus(501));
router.post('/:id/staff',       requireAuth, requireRole('VENDOR'), (_req, res) => res.sendStatus(501));

// PATCH /api/vendors/:id/approve      Approve a vendor application (Organizer of that event)
// PATCH /api/vendors/:id/reject       Reject a vendor application (Organizer of that event)
router.patch('/:id/approve',    requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.patch('/:id/reject',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

export default router;
