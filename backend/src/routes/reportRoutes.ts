import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getEventReport, getEventReportById } from '../controllers/reportController';

const router = Router();

// GET /api/reports/events        Aggregate report across all events
// GET /api/reports/events/:id    Per-event report
router.get('/events',       requireAuth, requireRole('ADMIN'), getEventReport);
router.get('/events/:id',   requireAuth, requireRole('ADMIN'), getEventReportById);

export default router;
