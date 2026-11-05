import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { sendOrganizerInvitation } from '@/services/emailService';

const prisma = new PrismaClient();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listOrganizers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizers = await prisma.user.findMany({
      where: { role: Role.ORGANIZER },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        organizationName: true,
        organizationDescription: true,
        phone: true,
        profileApprovalStatus: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: organizers });
  } catch (err) {
    next(err);
  }
};

export const approveOrganizerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizerId = req.params.id;
    if (typeof organizerId !== 'string' || !organizerId.trim()) {
      res.status(400).json({ success: false, message: 'A valid organizer ID is required' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const organizer = await transaction.user.findFirst({
        where: { id: organizerId, role: Role.ORGANIZER },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          organizationName: true,
          profileApprovalStatus: true,
        },
      });
      if (!organizer) return { error: 'not_found' as const };
      if (
        !organizer.firstname.trim() ||
        !organizer.lastname.trim() ||
        !organizer.organizationName?.trim()
      ) {
        return { error: 'incomplete' as const };
      }
      if (organizer.profileApprovalStatus === 'APPROVED') return { error: 'already_approved' as const };

      const updated = await transaction.user.updateMany({
        where: {
          id: organizer.id,
          role: Role.ORGANIZER,
          profileApprovalStatus: 'PENDING_APPROVAL',
        },
        data: { profileApprovalStatus: 'APPROVED' },
      });
      if (updated.count !== 1) return { error: 'already_approved' as const };

      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: organizer.id,
          action: 'ORGANIZER_PROFILE_APPROVED',
          outcome: 'approved',
        },
      });
      return { error: null, organizer };
    });

    if (result.error === 'not_found') {
      res.status(404).json({ success: false, message: 'Organizer account not found' });
      return;
    }
    if (result.error === 'incomplete') {
      res.status(400).json({ success: false, message: 'The organizer must complete their profile before it can be approved.' });
      return;
    }
    if (result.error === 'already_approved') {
      res.status(409).json({ success: false, message: 'This organizer profile is already approved.' });
      return;
    }

    res.json({
      success: true,
      message: `Organizer profile for ${result.organizer.firstname} ${result.organizer.lastname} approved.`,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectOrganizerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizerId = req.params.id;
    if (typeof organizerId !== 'string' || !organizerId.trim()) {
      res.status(400).json({ success: false, message: 'A valid organizer ID is required' });
      return;
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 10 || reason.length > 2000) {
      res.status(400).json({ success: false, message: 'Rejection feedback must be between 10 and 2000 characters.' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const updated = await transaction.user.updateMany({
        where: {
          id: organizerId,
          role: Role.ORGANIZER,
          profileApprovalStatus: 'PENDING_APPROVAL',
        },
        data: { profileApprovalStatus: 'REJECTED', profileRejectionReason: reason },
      });
      if (updated.count !== 1) {
        const organizer = await transaction.user.findFirst({
          where: { id: organizerId, role: Role.ORGANIZER },
          select: { profileApprovalStatus: true },
        });
        return organizer ? { error: 'not_pending' as const } : { error: 'not_found' as const };
      }

      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: organizerId,
          action: 'ORGANIZER_PROFILE_REJECTED',
          outcome: 'rejected',
        },
      });
      return { error: null as null };
    });

    if (result.error === 'not_found') {
      res.status(404).json({ success: false, message: 'Organizer account not found' });
      return;
    }
    if (result.error === 'not_pending') {
      res.status(409).json({ success: false, message: 'This organizer profile is not awaiting approval.' });
      return;
    }

    res.json({ success: true, message: 'Organizer profile rejected.' });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganizerAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizerId = req.params.id;
    if (typeof organizerId !== 'string' || !organizerId.trim()) {
      res.status(400).json({ success: false, message: 'A valid organizer ID is required' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const organizer = await transaction.user.findFirst({
        where: {
          id: organizerId,
          role: Role.ORGANIZER,
          profileApprovalStatus: 'APPROVED',
        },
        select: { id: true },
      });
      if (!organizer) return false;

      const events = await transaction.event.findMany({
        where: { organizerId },
        select: { id: true },
      });
      const eventIds = events.map(event => event.id);
      const bookings = await transaction.booking.findMany({
        where: {
          OR: [
            { attendeeId: organizerId },
            ...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const bookingIds = bookings.map(booking => booking.id);
      const applications = await transaction.vendorApplication.findMany({
        where: {
          OR: [
            { vendorId: organizerId },
            ...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const applicationIds = applications.map(application => application.id);

      await transaction.ticket.deleteMany({
        where: {
          OR: [
            { holderId: organizerId },
            ...(bookingIds.length ? [{ bookingId: { in: bookingIds } }] : []),
            ...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
          ],
        },
      });
      if (bookingIds.length) {
        await transaction.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await transaction.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }

      if (applicationIds.length) {
        await transaction.vendorStaffMember.deleteMany({
          where: { applicationId: { in: applicationIds } },
        });
        await transaction.vendorApplication.deleteMany({
          where: { id: { in: applicationIds } },
        });
      }
      if (eventIds.length) {
        await transaction.event.deleteMany({ where: { id: { in: eventIds } } });
      }

      await transaction.auditLog.deleteMany({
        where: { OR: [{ actorId: organizerId }, { affectedUserId: organizerId }] },
      });
      await transaction.user.delete({ where: { id: organizerId } });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: organizerId,
          action: 'ORGANIZER_ACCOUNT_DELETED',
          outcome: 'permanently_deleted',
        },
      });
      return true;
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Approved organizer account not found' });
      return;
    }

    res.json({ success: true, message: 'Organizer account and related records permanently deleted.' });
  } catch (error) {
    next(error);
  }
};

export const createOrganizer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const firstname = typeof req.body?.firstname === 'string' ? req.body.firstname.trim() : '';
    const lastname = typeof req.body?.lastname === 'string' ? req.body.lastname.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (
      firstname.length < 1 || firstname.length > 100 ||
      lastname.length < 1 || lastname.length > 100 ||
      email.length > 254 || !EMAIL_REGEX.test(email)
    ) {
      res.status(400).json({
        success: false,
        message: 'First name and last name (up to 100 characters) and a valid email address are required',
      });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with that email address already exists' });
      return;
    }

    const temporaryPassword = randomBytes(32).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const organizer = await prisma.$transaction(async transaction => {
      const created = await transaction.user.create({
        data: {
          firstname,
          lastname,
          email,
          role: Role.ORGANIZER,
          emailVerified: true,
          mustChangePassword: true,
          passwordHash,
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          organizationName: true,
          organizationDescription: true,
          phone: true,
          profileApprovalStatus: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ORGANIZER_ACCOUNT_CREATED',
          affectedUserId: created.id,
          outcome: 'created',
        },
      });
      return created;
    });
    try {
      await sendOrganizerInvitation(email, firstname, temporaryPassword);
    } catch (err) {
      await prisma.$transaction(async transaction => {
        await transaction.auditLog.create({
          data: {
            actorId: req.user!.id,
            action: 'ORGANIZER_INVITATION_DELIVERY_FAILED',
            affectedUserId: organizer.id,
            outcome: 'email_delivery_failed',
          },
        });
        await transaction.user.delete({ where: { id: organizer.id } });
      });
      next(err);
      return;
    }

    res.status(201).json({
      success: true,
      data: organizer,
      message: 'Organizer account created. A temporary password has been emailed; the organizer must set a permanent password before continuing.',
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'An account with that email address already exists' });
      return;
    }
    next(err);
  }
};
