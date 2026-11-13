import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { validateUuidParam } from '../middleware/requestValidation';

const router = Router();
router.param('id', validateUuidParam);

router.get('/', requireAuth, async (req, res) => {
  if (Object.keys(req.query).some(key => key !== 'page' && key !== 'limit')) {
    return res.status(400).json({ success: false, message: 'Unsupported notification filter' });
  }
  const recipientId = req.user!.id;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const [notifications, unreadCount, total] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { recipientId, readAt: null } }),
    prisma.notification.count({ where: { recipientId } }),
  ]);
  return res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: { page, limit, pageSize: limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.patch('/read-all', requireAuth, async (req, res) => {
  if (Object.keys(req.body as Record<string, unknown>).length > 0) {
    return res.status(400).json({ success: false, message: 'This operation does not accept a request body' });
  }
  await prisma.notification.updateMany({
    where: { recipientId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  return res.json({ success: true, message: 'Notifications marked as read.' });
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    return res.status(400).json({ success: false, message: 'A valid notification ID is required.' });
  }
  if (Object.keys(req.body as Record<string, unknown>).length > 0) {
    return res.status(400).json({ success: false, message: 'This operation does not accept a request body' });
  }

  const notification = await prisma.notification.updateMany({
    where: { id, recipientId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  if (notification.count === 0) {
    const exists = await prisma.notification.findFirst({
      where: { id, recipientId: req.user!.id },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
  }

  return res.json({ success: true, message: 'Notification marked as read.' });
});

export default router;
