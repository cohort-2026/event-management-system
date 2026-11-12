import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/reports/events        Aggregate report across all events
// GET /api/reports/events/:id    Per-event report
router.get('/events',       requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));
router.get('/events/:id',   requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));

export default router;
