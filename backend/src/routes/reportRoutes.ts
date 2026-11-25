import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getEventReport, getEventReportById, getFinalEventReport } from '../controllers/reportController';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

// GET /api/reports/events        Aggregate report across all events
// GET /api/reports/events/:id    Per-event report
router.get('/events',       requireAuth, requireRole('ADMIN'), getEventReport);
router.get('/events/:id/final', requireAuth, requireRole('ORGANIZER'), getFinalEventReport);
router.get('/events/:id',   requireAuth, requireRole('ADMIN'), getEventReportById);

export default router;
