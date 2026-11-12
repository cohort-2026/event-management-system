import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient, Role, VendorProfileStatus } from '@prisma/client';

const prisma = new PrismaClient();
const USER_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
} as const;

export const listUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid user ID is required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    const role = req.body?.role;
    if (!id || !['ATTENDEE', 'VENDOR', 'ORGANIZER'].includes(role)) {
      res.status(400).json({ success: false, message: 'A valid user ID and non-admin role are required' });
      return;
    }
    if (id === req.user!.id) {
      res.status(409).json({ success: false, message: 'You cannot change your own role' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const current = await transaction.user.findFirst({
        where: { id, role: { not: Role.ADMIN } },
        select: { id: true, role: true },
      });
      if (!current) return null;

      const updated = await transaction.user.update({
        where: { id },
        data: {
          role,
          ...(role === Role.ORGANIZER ? {
            profileApprovalStatus: 'PENDING_APPROVAL',
            profileRejectionReason: null,
          } : {}),
        },
        select: USER_SELECT,
      });
      if (role === Role.VENDOR) {
        await transaction.vendorProfile.updateMany({
          where: { userId: id },
          data: {
            status: VendorProfileStatus.DRAFT,
            rejectionReason: null,
            reviewedAt: null,
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: id,
          action: 'USER_ROLE_UPDATED',
          outcome: `${current.role}_TO_${role}`,
        },
      });
      return updated;
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Non-administrator user not found' });
      return;
    }
    res.json({ success: true, data: result, message: 'User role updated.' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    next(error);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid user ID is required' });
      return;
    }
    if (id === req.user!.id) {
      res.status(409).json({ success: false, message: 'You cannot deactivate your own account' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const updated = await transaction.user.updateMany({
        where: { id, role: { not: Role.ADMIN }, isActive: true },
        data: { isActive: false },
      });
      if (updated.count !== 1) {
        const exists = await transaction.user.findFirst({
          where: { id, role: { not: Role.ADMIN } },
          select: { isActive: true },
        });
        return exists ? 'inactive' as const : 'not_found' as const;
      }
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: id,
          action: 'USER_ACCOUNT_DEACTIVATED',
          outcome: 'deactivated',
        },
      });
      return 'deactivated' as const;
    });

    if (result === 'not_found') {
      res.status(404).json({ success: false, message: 'Non-administrator user not found' });
      return;
    }
    res.json({ success: true, message: result === 'inactive' ? 'User account is already inactive.' : 'User account deactivated.' });
  } catch (error) {
    next(error);
  }
};
