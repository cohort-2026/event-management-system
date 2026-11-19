import { Request, Response, NextFunction } from 'express';
import { EventStatus, ProfileApprovalStatus, Role, TicketStatus, VendorProfileStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const getAdminDashboardOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now).split('-').map(Number);
    const localToday = new Date(Date.UTC(year, month - 1, day));
    const daysSinceMonday = (localToday.getUTCDay() + 6) % 7;
    const weekStart = new Date(Date.UTC(year, month - 1, day - daysSinceMonday) - 2 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [
      draftEvents,
      oldestDraftEvent,
      pendingOrganizers,
      oldestPendingOrganizer,
      pendingVendors,
      oldestPendingVendor,
      upcomingPublishedEvents,
      bookingsThisWeek,
      ticketsIssuedLast30Days,
      ticketsCheckedInLast30Days,
    ] = await Promise.all([
      prisma.event.count({ where: { status: EventStatus.DRAFT } }),
      prisma.event.findFirst({ where: { status: EventStatus.DRAFT }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { createdAt: true } }),
      prisma.user.count({ where: { role: Role.ORGANIZER, profileApprovalStatus: ProfileApprovalStatus.PENDING_APPROVAL } }),
      prisma.user.findFirst({ where: { role: Role.ORGANIZER, profileApprovalStatus: ProfileApprovalStatus.PENDING_APPROVAL }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { createdAt: true } }),
      prisma.vendorProfile.count({ where: { status: VendorProfileStatus.PENDING_REVIEW, user: { is: { role: Role.VENDOR } } } }),
      prisma.vendorProfile.findFirst({ where: { status: VendorProfileStatus.PENDING_REVIEW, user: { is: { role: Role.VENDOR } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { createdAt: true } }),
      prisma.event.count({ where: { status: EventStatus.PUBLISHED, startTime: { gte: now } } }),
      prisma.booking.count({ where: { createdAt: { gte: weekStart, lte: now } } }),
      prisma.ticket.count({ where: { issuedAt: { gte: thirtyDaysAgo }, status: { not: TicketStatus.CANCELLED } } }),
      prisma.ticket.count({ where: { issuedAt: { gte: thirtyDaysAgo }, checkedInAt: { gte: thirtyDaysAgo, lte: now }, status: TicketStatus.USED } }),
    ]);

    const ageInHours = (createdAt: Date | undefined) => createdAt
      ? Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 3_600_000))
      : null;

    res.json({
      success: true,
      data: {
        review: {
          events: { count: draftEvents, oldestWaitingHours: ageInHours(oldestDraftEvent?.createdAt) },
          organizers: { count: pendingOrganizers, oldestWaitingHours: ageInHours(oldestPendingOrganizer?.createdAt) },
          vendors: { count: pendingVendors, oldestWaitingHours: ageInHours(oldestPendingVendor?.createdAt) },
        },
        reports: {
          upcomingPublishedEvents,
          bookingsThisWeek,
          attendanceLast30Days: ticketsIssuedLast30Days === 0
            ? 0
            : Math.round((ticketsCheckedInLast30Days / ticketsIssuedLast30Days) * 100),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
