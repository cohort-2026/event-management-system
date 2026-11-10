import { Router } from 'express';
import { createAdmin, listAdmins, listAuditHistory, updateAdminStatus } from '../controllers/platformAdminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('PLATFORM_ADMIN'));
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id/status', updateAdminStatus);
router.get('/audit-logs', listAuditHistory);

export default router;
