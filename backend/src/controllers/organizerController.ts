import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Prisma, ProfileApprovalStatus, Role } from '@prisma/client';
import { sendOrganizerInvitation } from '../services/emailService';
import { prisma } from '../lib/prisma';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORGANIZER_QUERY_KEYS = new Set(['page', 'limit', 'search', 'status', 'sortBy', 'sortOrder']);
const ORGANIZER_SORT_FIELDS = ['createdAt', 'firstname', 'lastname', 'email', 'organizationName', 'profileApprovalStatus'] as const;
type OrganizerSortField = typeof ORGANIZER_SORT_FIELDS[number];
type OrganizerOrder = 'asc' | 'desc';

const readQueryString = (req: Request, key: string): string | undefined | null => {
  const value = req.query[key];
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value.trim() : null;
};

export const listOrganizers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (Object.keys(req.query).some(key => !ORGANIZER_QUERY_KEYS.has(key))) {
      res.status(400).json({ success: false, message: 'Unsupported organizer filter' });
      return;
    }
    const search = readQueryString(req, 'search');
    const status = readQueryString(req, 'status');
    const rawSortBy = readQueryString(req, 'sortBy');
    const rawSortOrder = readQueryString(req, 'sortOrder');
    const sortBy = rawSortBy === undefined ? 'createdAt' : rawSortBy;
    const sortOrder = rawSortOrder === undefined ? 'desc' : rawSortOrder;
    if (
      search === null ||
      (search !== undefined && search.length > 100) ||
      status === null ||
      (status !== undefined && !Object.values(ProfileApprovalStatus).some(value => value === status)) ||
      sortBy === null ||
      !ORGANIZER_SORT_FIELDS.some(value => value === sortBy) ||
      sortOrder === null ||
      !['asc', 'desc'].includes(sortOrder.toLowerCase())
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid organizer filters',
        errors: [{ field: 'query', message: 'Use valid status, search, sortBy and sortOrder values' }],
      });
      return;
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const where: Prisma.UserWhereInput = {
      role: Role.ORGANIZER,
      ...(status ? { profileApprovalStatus: status as ProfileApprovalStatus } : {}),
      ...(search ? {
        OR: [
          { firstname: { contains: search, mode: 'insensitive' } },
          { lastname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { organizationName: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
      { [sortBy as OrganizerSortField]: sortOrder.toLowerCase() as OrganizerOrder },
      { id: 'asc' },
    ];
    const [organizers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          organizationName: true,
          organizationEmail: true,
          organizationRegistrationNumber: true,
          organizationDescription: true,
          phone: true,
          profileApprovalStatus: true,
          profileRejectionReason: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({
      success: true,
      data: organizers,
      pagination: { page, limit, pageSize: limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const getOrganizer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const organizer = await prisma.user.findFirst({
      where: { id, role: Role.ORGANIZER },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        organizationName: true,
        organizationEmail: true,
        organizationRegistrationNumber: true,
        organizationDescription: true,
        phone: true,
        profileApprovalStatus: true,
        profileRejectionReason: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    if (!organizer) {
      res.status(404).json({ success: false, message: 'Organizer not found' });
      return;
    }
    res.json({ success: true, data: organizer });
  } catch (error) {
    next(error);
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
          organizationEmail: true,
          organizationRegistrationNumber: true,
          phone: true,
          profileApprovalStatus: true,
        },
      });
      if (!organizer) return { error: 'not_found' as const };
      if (organizer.profileApprovalStatus === ProfileApprovalStatus.APPROVED) {
        return { error: 'already_approved' as const };
      }
      if (organizer.profileApprovalStatus !== ProfileApprovalStatus.PENDING_APPROVAL) {
        return { error: 'not_pending' as const };
      }
      if (
        !organizer.firstname.trim() ||
        !organizer.lastname.trim() ||
        !organizer.organizationName?.trim() ||
        !organizer.organizationEmail?.trim() ||
        !organizer.organizationRegistrationNumber?.trim() ||
        !organizer.phone?.trim()
      ) {
        return { error: 'incomplete' as const };
      }

      const updated = await transaction.user.updateMany({
        where: {
          id: organizer.id,
          role: Role.ORGANIZER,
          profileApprovalStatus: 'PENDING_APPROVAL',
        },
        data: { profileApprovalStatus: 'APPROVED', profileRejectionReason: null },
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
    if (result.error === 'not_pending') {
      res.status(409).json({ success: false, message: 'This organizer profile is not awaiting approval.' });
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
        },
        select: { id: true, isActive: true },
      });
      if (!organizer) return 'not_found' as const;
      if (!organizer.isActive) return 'inactive' as const;
      const updated = await transaction.user.updateMany({
        where: { id: organizerId, role: Role.ORGANIZER, isActive: true },
        data: { isActive: false },
      });
      if (updated.count !== 1) return 'changed_concurrently' as const;
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: organizerId,
          action: 'USER_ACCOUNT_DEACTIVATED',
          outcome: 'organizer_deactivated_records_preserved',
        },
      });
      return 'deactivated' as const;
    });

    if (result === 'not_found') {
      res.status(404).json({ success: false, message: 'Organizer account not found' });
      return;
    }
    if (result === 'inactive') {
      res.status(409).json({ success: false, message: 'Organizer account is already inactive.' });
      return;
    }
    if (result === 'changed_concurrently') {
      res.status(409).json({ success: false, message: 'Organizer account changed concurrently; reload and try again.' });
      return;
    }
    res.json({ success: true, message: 'Organizer access deactivated; profile and related records were preserved.' });
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
          organizationEmail: true,
          organizationRegistrationNumber: true,
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
