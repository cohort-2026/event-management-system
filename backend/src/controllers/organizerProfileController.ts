import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { notifyAdmins } from '@/services/notificationService';

const prisma = new PrismaClient();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ORGANIZER_PROFILE_SELECT = {
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
} as const;

interface OrganizerProfileInput {
  firstname: string;
  lastname: string;
  organizationName: string;
  organizationEmail: string;
  organizationRegistrationNumber: string;
  phone: string;
}

function validateProfile(body: unknown): { data?: OrganizerProfileInput; errors: Record<string, string> } {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const errors: Record<string, string> = {};

  const firstname = typeof input.firstname === 'string' ? input.firstname.trim() : '';
  const lastname = typeof input.lastname === 'string' ? input.lastname.trim() : '';
  const organizationName = typeof input.organizationName === 'string' ? input.organizationName.trim() : '';
  const organizationEmail = typeof input.organizationEmail === 'string' ? input.organizationEmail.trim().toLowerCase() : '';
  const organizationRegistrationNumber = typeof input.organizationRegistrationNumber === 'string'
    ? input.organizationRegistrationNumber
    : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  if (!EMAIL_REGEX.test(organizationEmail) || organizationEmail.length > 254) {
    errors.organizationEmail = 'Enter a valid organization email address';
  }
  if (input.organizationRegistrationNumber !== undefined && typeof input.organizationRegistrationNumber !== 'string') {
    errors.organizationRegistrationNumber = 'Enter a valid organization registration number';
  }
  if (input.phone !== undefined && typeof input.phone !== 'string') {
    errors.phone = 'Enter a valid phone number';
  }
  if (firstname.length < 1 || firstname.length > 80) errors.firstname = 'Enter a first name of up to 80 characters';
  if (lastname.length < 1 || lastname.length > 80) errors.lastname = 'Enter a last name of up to 80 characters';
  if (organizationName.length < 2 || organizationName.length > 120) {
    errors.organizationName = 'Enter an organization name between 2 and 120 characters';
  }
  if (!/^\d{9}$/.test(organizationRegistrationNumber)) {
    errors.organizationRegistrationNumber = 'Enter exactly 9 digits';
  }
  if (
    phone.length < 7 ||
    phone.length > 30 ||
    !/^\+?[0-9\s().-]+$/.test(phone) ||
    phone.replace(/\D/g, '').length < 7
  ) {
    errors.phone = 'Enter a valid phone number with at least 7 digits';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    data: {
      firstname,
      lastname,
      organizationName,
      organizationEmail,
      organizationRegistrationNumber,
      phone,
    },
  };
}

export const getOrganizerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: ORGANIZER_PROFILE_SELECT,
    });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Organizer profile not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateOrganizerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { data, errors } = validateProfile(req.body);
  if (!data) {
    res.status(400).json({
      success: false,
      message: 'Please correct the highlighted profile fields.',
      errors: Object.fromEntries(
        Object.entries(errors).map(([field, message]) => [field, [message]]),
      ),
    });
    return;
  }

  try {
    const profile = await prisma.$transaction(async transaction => {
      const current = await transaction.user.findUnique({
        where: { id: req.user!.id },
        select: {
          firstname: true,
          lastname: true,
          organizationName: true,
          organizationEmail: true,
          organizationRegistrationNumber: true,
          phone: true,
          profileApprovalStatus: true,
        },
      });
      if (!current) return null;

      const changed = current.firstname !== data.firstname ||
        current.lastname !== data.lastname ||
        current.organizationName !== data.organizationName ||
        current.organizationEmail !== data.organizationEmail ||
        current.organizationRegistrationNumber !== data.organizationRegistrationNumber ||
        current.phone !== data.phone;

      const profile = await transaction.user.update({
        where: { id: req.user!.id },
        data: {
          ...data,
          ...(changed ? {
            profileApprovalStatus: 'PENDING_APPROVAL',
            profileRejectionReason: null,
          } : {}),
        },
        select: ORGANIZER_PROFILE_SELECT,
      });
      const isNewRequest = changed && (
        current.profileApprovalStatus !== 'PENDING_APPROVAL' ||
        !current.firstname.trim() ||
        !current.lastname.trim() ||
        !current.organizationName?.trim() ||
        !current.organizationEmail?.trim() ||
        !current.organizationRegistrationNumber?.trim() ||
        !current.phone?.trim()
      );
      if (isNewRequest) {
        await notifyAdmins(transaction, {
          title: 'Organizer profile request',
          message: `${data.firstname} ${data.lastname} submitted an organizer profile for review.`,
          link: '/admin/users/organizers/pending',
        });
      }
      return profile;
    });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Organizer profile not found' });
      return;
    }

    res.json({ success: true, data: profile, message: 'Organizer profile saved.' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Organizer profile not found' });
      return;
    }
    next(error);
  }
};
