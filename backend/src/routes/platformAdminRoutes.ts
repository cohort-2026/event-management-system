import { Router } from 'express';
import { createAdmin, listAdmins, listAuditHistory, updateAdminStatus } from '../controllers/platformAdminController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);
router.use(requireAuth, requireRole('ADMIN'));
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id/status', updateAdminStatus);
router.get('/audit-logs', listAuditHistory);

export default router;
