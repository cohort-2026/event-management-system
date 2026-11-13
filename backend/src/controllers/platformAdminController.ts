import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Prisma, Role } from '@prisma/client';
import { sendAdminInvitation } from '../services/emailService';
import { prisma } from '../lib/prisma';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listAdmins = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        isActive: true,
        createdAt: true,
        mustChangePassword: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const firstname = typeof req.body.firstname === 'string' ? req.body.firstname.trim() : '';
    const lastname = typeof req.body.lastname === 'string' ? req.body.lastname.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!firstname || !lastname || !EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'First name, last name and a valid email address are required' });
      return;
    }

    const temporaryPassword = randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const created = await prisma.$transaction(async transaction => {
      const admin = await transaction.user.create({
        data: {
          firstname,
          lastname,
          email,
          role: Role.ADMIN,
          emailVerified: true,
          mustChangePassword: true,
          passwordHash,
        },
        select: { id: true, firstname: true, lastname: true, email: true, isActive: true, createdAt: true, mustChangePassword: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ADMIN_ACCOUNT_CREATED',
          affectedUserId: admin.id,
          outcome: 'created',
        },
      });
      return admin;
    });

    try {
      await sendAdminInvitation(email, firstname, temporaryPassword);
    } catch (err) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ADMIN_INVITATION_DELIVERY_FAILED',
          affectedUserId: created.id,
          outcome: 'email_delivery_failed',
        },
      });
      next(err);
      return;
    }

    res.status(201).json({
      success: true,
      data: created,
      message: 'Administrator created. A temporary password has been sent to their email address.',
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ADMIN_ACCOUNT_CREATION_REJECTED',
          outcome: 'duplicate_email',
        },
      });
      res.status(409).json({ success: false, message: 'An account with that email address already exists' });
      return;
    }
    next(err);
  }
};

export const updateAdminStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive } = req.body;
    const targetUserId = req.params.id;
    if (
      typeof isActive !== 'boolean' ||
      Object.keys(req.body as Record<string, unknown>).some(key => key !== 'isActive')
    ) {
      res.status(400).json({ success: false, message: 'Provide only a boolean isActive value' });
      return;
    }
    if (typeof targetUserId !== 'string') {
      res.status(400).json({ success: false, message: 'A single administrator ID is required' });
      return;
    }
    if (targetUserId === req.user!.id && !isActive) {
      res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "users"
        WHERE "role" = 'ADMIN'::"Role" AND "is_active" = TRUE
        ORDER BY "id"
        FOR UPDATE
      `;
      const current = await transaction.user.findFirst({
        where: { id: targetUserId, role: Role.ADMIN },
        select: { id: true, isActive: true },
      });
      if (!current) return { error: 'not_found' as const };
      if (current.isActive === isActive) return { user: current, changed: false };
      if (!isActive && current.isActive) {
        const activeAdminCount = await transaction.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminCount <= 1) return { error: 'last_admin' as const };
      }

      const updated = await transaction.user.updateMany({
        where: { id: targetUserId, role: Role.ADMIN, isActive: current.isActive },
        data: { isActive },
      });
      if (updated.count !== 1) return { error: 'changed_concurrently' as const };
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: isActive ? 'ADMIN_ACCOUNT_ACTIVATED' : 'ADMIN_ACCOUNT_DEACTIVATED',
          affectedUserId: targetUserId,
          outcome: isActive ? 'activated' : 'deactivated',
        },
      });
      return {
        changed: true,
        user: { id: targetUserId, isActive },
      };
    });

    if ('error' in result && result.error === 'not_found') {
      res.status(404).json({ success: false, message: 'Administrator account not found' });
      return;
    }
    if ('error' in result && result.error === 'last_admin') {
      res.status(409).json({ success: false, message: 'The last active administrator cannot be deactivated' });
      return;
    }
    if ('error' in result && result.error === 'changed_concurrently') {
      res.status(409).json({ success: false, message: 'Administrator account changed concurrently; reload and try again' });
      return;
    }
    res.json({
      success: true,
      data: result.user,
      message: `Administrator account ${isActive ? 'activated' : 'deactivated'}${result.changed ? '' : ' (already in that state)'}.`,
    });
  } catch (err) {
    next(err);
  }
};

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
