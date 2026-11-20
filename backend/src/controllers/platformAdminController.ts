import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const listAuditHistory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const events = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        affectedUserId: true,
        outcome: true,
        createdAt: true,
        actor: { select: { firstname: true, lastname: true, email: true } },
      },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};
