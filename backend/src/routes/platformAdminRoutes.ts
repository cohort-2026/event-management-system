import { Router } from 'express';
import { listAuditHistory } from '../controllers/platformAdminController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateUuidParam } from '../middleware/requestValidation';
import { getAdminDashboardOverview } from '../controllers/adminDashboardController';

const router = Router();
router.param('id', validateUuidParam);
router.use(requireAuth, requireRole('ADMIN'));
router.get('/audit-logs', listAuditHistory);

export default router;
