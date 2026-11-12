import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/',           requireAuth, requireRole('ADMIN'), async (req, res) => {
  const recipientId = req.user!.id;
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({ where: { recipientId, readAt: null } }),
  ]);
  res.json({ success: true, data: notifications, unreadCount });
});

router.patch('/read-all', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.notification.updateMany({
    where: { recipientId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true, message: 'Notifications marked as read.' });
});

router.patch('/:id/read', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    res.status(400).json({ success: false, message: 'A valid notification ID is required.' });
    return;
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
      res.status(404).json({ success: false, message: 'Notification not found.' });
      return;
    }
  }

  res.json({ success: true, message: 'Notification marked as read.' });
});

export default router;
