import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { sendAdminInvitation } from '../services/emailService';

const prisma = new PrismaClient();
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
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, message: 'isActive must be a boolean' });
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
      const updated = await transaction.user.updateMany({
        where: { id: targetUserId, role: Role.ADMIN },
        data: { isActive },
      });
      if (updated.count !== 1) return false;
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: isActive ? 'ADMIN_ACCOUNT_ACTIVATED' : 'ADMIN_ACCOUNT_DEACTIVATED',
          affectedUserId: targetUserId,
          outcome: isActive ? 'activated' : 'deactivated',
        },
      });
      return true;
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Administrator account not found' });
      return;
    }
    res.json({ success: true, message: `Administrator account ${isActive ? 'activated' : 'deactivated'}` });
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
