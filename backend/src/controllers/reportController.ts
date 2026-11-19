import { Request, Response, NextFunction } from 'express';
import {
  BookingStatus,
  EventStatus,
  PaymentStatus,
  Prisma,
  TicketStatus,
  VendorApplicationStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';

const REPORT_QUERY_KEYS = new Set(['page', 'limit', 'startDate', 'endDate']);

const parseDateFilter = (value: string | undefined): Date | undefined | null => {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed : null;
};

const countMap = <T extends string>(rows: Array<{ status: T; _count: { _all: number } }>): Map<T, number> =>
  new Map(rows.map(row => [row.status, row._count._all]));

const amountMap = <T extends string>(rows: Array<{ status: T; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }>) =>
  new Map(rows.map(row => [row.status, { count: row._count._all, amount: Number(row._sum.amount ?? 0) }]));

const percentage = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 10000) / 100;

const paymentStatusSummary = (payments: Map<PaymentStatus, { count: number; amount: number }>) =>
  Object.values(PaymentStatus).map(status => ({
    status,
    count: payments.get(status)?.count ?? 0,
  }));

const bookingPaymentStatusSummary = (
  payments: Map<PaymentStatus, { count: number; amount: number }>,
  bookingPaymentStatuses: Map<PaymentStatus, number>,
) => Object.values(PaymentStatus).map(status => ({
  status,
  count: status === PaymentStatus.NOT_REQUIRED
    ? bookingPaymentStatuses.get(status) ?? 0
    : payments.get(status)?.count ?? 0,
}));

const financialSummary = (
  payments: Map<PaymentStatus, { count: number; amount: number }>,
  notRequiredCount: number,
) => ({
  paymentMode: 'SIMULATED' as const,
  paidCount: payments.get(PaymentStatus.PAID)?.count ?? 0,
  simulatedPaidAmount: payments.get(PaymentStatus.PAID)?.amount ?? 0,
  pendingCount: payments.get(PaymentStatus.PENDING)?.count ?? 0,
  simulatedPendingAmount: payments.get(PaymentStatus.PENDING)?.amount ?? 0,
  failedCount: payments.get(PaymentStatus.FAILED)?.count ?? 0,
  failedAmount: payments.get(PaymentStatus.FAILED)?.amount ?? 0,
  notRequiredBookingCount: notRequiredCount,
  notRequiredAmount: 0,
});

export const getEventReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (Object.keys(req.query).some(key => !REPORT_QUERY_KEYS.has(key))) {
      res.status(400).json({ success: false, message: 'Unsupported report filter' });
      return;
    }
    const readDateQuery = (key: string): string | undefined | null => {
      const value = req.query[key];
      return value === undefined ? undefined : typeof value === 'string' ? value : null;
    };
    const startDate = parseDateFilter(readDateQuery('startDate') ?? undefined);
    const endDate = parseDateFilter(readDateQuery('endDate') ?? undefined);
    if (startDate === null || endDate === null) {
      res.status(400).json({
        success: false,
        message: 'Dates must use the YYYY-MM-DD format and be valid calendar dates',
      });
      return;
    }
    if (readDateQuery('startDate') === null || readDateQuery('endDate') === null) {
      res.status(400).json({ success: false, message: 'Date filters must be single YYYY-MM-DD values' });
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      res.status(400).json({ success: false, message: 'startDate must be on or before endDate' });
      return;
    }

    const startBoundary = startDate;
    const endBoundary = endDate
      ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1)
      : undefined;
    const eventWhere: Prisma.EventWhereInput = startBoundary || endBoundary
      ? { createdAt: { ...(startBoundary ? { gte: startBoundary } : {}), ...(endBoundary ? { lte: endBoundary } : {}) } }
      : {};
    const bookingWhere: Prisma.BookingWhereInput = { event: { is: eventWhere } };
    const paymentWhere: Prisma.PaymentWhereInput = { booking: { is: { event: { is: eventWhere } } } };
    const ticketWhere: Prisma.TicketWhereInput = { event: { is: eventWhere } };
    const vendorApplicationWhere: Prisma.VendorApplicationWhereInput = { event: { is: eventWhere } };
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const [
      events,
      totalEvents,
      eventStatusRows,
      categoryRows,
      bookingStatusRows,
      bookingPaymentStatusRows,
      paymentRows,
      ticketsIssued,
      validTickets,
      checkedInTickets,
      vendorApplicationStatusRows,
    ] = await Promise.all([
      prisma.event.findMany({
        where: eventWhere,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          date: true,
          startTime: true,
          endTime: true,
          createdAt: true,
          capacity: true,
          availableCapacity: true,
          organizer: { select: { id: true, firstname: true, lastname: true, email: true } },
          _count: { select: { bookings: true, tickets: true, vendorApplications: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where: eventWhere }),
      prisma.event.groupBy({ by: ['status'], where: eventWhere, _count: { _all: true } }),
      prisma.event.groupBy({ by: ['category'], where: eventWhere, _count: { _all: true }, orderBy: { category: 'asc' } }),
      prisma.booking.groupBy({ by: ['status'], where: bookingWhere, _count: { _all: true } }),
      prisma.booking.groupBy({ by: ['paymentStatus'], where: bookingWhere, _count: { _all: true } }),
      prisma.payment.groupBy({
        by: ['status'],
        where: paymentWhere,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.ticket.count({ where: ticketWhere }),
      prisma.ticket.count({ where: { ...ticketWhere, status: { not: TicketStatus.CANCELLED } } }),
      prisma.ticket.count({ where: { ...ticketWhere, status: TicketStatus.USED } }),
      prisma.vendorApplication.groupBy({
        by: ['status'],
        where: vendorApplicationWhere,
        _count: { _all: true },
      }),
    ]);

    const eventStatuses = countMap(eventStatusRows);
    const bookingStatuses = countMap(bookingStatusRows);
    const bookingPaymentStatuses = new Map(bookingPaymentStatusRows.map(row => [row.paymentStatus, row._count._all]));
    const payments = amountMap(paymentRows);
    const vendorApplicationStatuses = countMap(vendorApplicationStatusRows);
    const notRequiredCount = bookingPaymentStatuses.get(PaymentStatus.NOT_REQUIRED) ?? 0;
    const simulatedFinancials = financialSummary(payments, notRequiredCount);
    const totalBookings = [...bookingStatuses.values()].reduce((total, count) => total + count, 0);

    res.json({
      success: true,
      message: 'Payment figures represent simulated payments only, not real financial transactions.',
      data: {
        events,
        statusCounts: Object.values(EventStatus).map(status => ({
          status,
          count: eventStatuses.get(status) ?? 0,
        })),
        categoryCounts: categoryRows.map(({ category, _count }) => ({ category, count: _count._all })),
        bookingCounts: Object.values(BookingStatus).map(status => ({
          status,
          count: bookingStatuses.get(status) ?? 0,
        })),
        paymentStatusCounts: paymentStatusSummary(payments),
        bookingPaymentStatusCounts: bookingPaymentStatusSummary(payments, bookingPaymentStatuses),
        vendorApplicationCounts: Object.values(VendorApplicationStatus).map(status => ({
          status,
          count: vendorApplicationStatuses.get(status) ?? 0,
        })),
        summary: {
          totalEvents,
          publishedEvents: eventStatuses.get(EventStatus.PUBLISHED) ?? 0,
          draftEvents: eventStatuses.get(EventStatus.DRAFT) ?? 0,
          cancelledEvents: eventStatuses.get(EventStatus.CANCELLED) ?? 0,
          completedEvents: eventStatuses.get(EventStatus.COMPLETED) ?? 0,
          totalBookings,
          confirmedBookings: bookingStatuses.get(BookingStatus.CONFIRMED) ?? 0,
          pendingBookings: bookingStatuses.get(BookingStatus.PENDING) ?? 0,
          cancelledBookings: bookingStatuses.get(BookingStatus.CANCELLED) ?? 0,
          ticketsIssued,
          validTickets,
          checkedInTickets,
          attendancePercentage: percentage(checkedInTickets, validTickets),
        },
        financialSummary: simulatedFinancials,
        paidRevenue: simulatedFinancials.simulatedPaidAmount,
      },
      pagination: { page, limit, pageSize: limit, total: totalEvents, totalPages: Math.ceil(totalEvents / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventReportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        venue: true,
        date: true,
        startTime: true,
        endTime: true,
        eventType: true,
        bannerImageUrl: true,
        vendorStandsAvailable: true,
        vendorStandRatePerSqm: true,
        capacity: true,
        availableCapacity: true,
        isFree: true,
        price: true,
        status: true,
        createdAt: true,
        organizer: {
          select: { id: true, firstname: true, lastname: true, email: true, organizationName: true },
        },
        ticketTypes: {
          select: { id: true, name: true, description: true, price: true, quantity: true, availableQuantity: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const [
      bookingStatusRows,
      bookingPaymentStatusRows,
      paymentRows,
      ticketStatusRows,
      vendorApplicationStatusRows,
    ] = await Promise.all([
      prisma.booking.groupBy({ by: ['status'], where: { eventId: id }, _count: { _all: true } }),
      prisma.booking.groupBy({ by: ['paymentStatus'], where: { eventId: id }, _count: { _all: true } }),
      prisma.payment.groupBy({
        by: ['status'],
        where: { booking: { is: { eventId: id } } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.ticket.groupBy({ by: ['status'], where: { eventId: id }, _count: { _all: true } }),
      prisma.vendorApplication.groupBy({ by: ['status'], where: { eventId: id }, _count: { _all: true } }),
    ]);

    const bookingStatuses = countMap(bookingStatusRows);
    const bookingPaymentStatuses = new Map(bookingPaymentStatusRows.map(row => [row.paymentStatus, row._count._all]));
    const payments = amountMap(paymentRows);
    const ticketStatuses = countMap(ticketStatusRows);
    const vendorApplicationStatuses = countMap(vendorApplicationStatusRows);
    const ticketsIssued = [...ticketStatuses.values()].reduce((total, count) => total + count, 0);
    const checkedInTickets = ticketStatuses.get(TicketStatus.USED) ?? 0;
    const validTickets = ticketsIssued - (ticketStatuses.get(TicketStatus.CANCELLED) ?? 0);
    const notRequiredCount = bookingPaymentStatuses.get(PaymentStatus.NOT_REQUIRED) ?? 0;
    const simulatedFinancials = financialSummary(payments, notRequiredCount);
    const totalBookings = [...bookingStatuses.values()].reduce((total, count) => total + count, 0);

    res.json({
      success: true,
      message: 'Payment figures represent simulated payments only, not real financial transactions.',
      data: {
        event,
        bookingsByStatus: Object.values(BookingStatus).map(status => ({
          status,
          count: bookingStatuses.get(status) ?? 0,
        })),
        bookingPaymentStatusCounts: bookingPaymentStatusSummary(payments, bookingPaymentStatuses),
        paymentsByStatus: Object.values(PaymentStatus).map(status => ({
          status,
          ...(payments.get(status) ?? { count: 0, amount: 0 }),
        })),
        ticketsByStatus: Object.values(TicketStatus).map(status => ({
          status,
          count: ticketStatuses.get(status) ?? 0,
        })),
        vendorApplicationsByStatus: Object.values(VendorApplicationStatus).map(status => ({
          status,
          count: vendorApplicationStatuses.get(status) ?? 0,
        })),
        summary: {
          totalBookings,
          confirmedBookings: bookingStatuses.get(BookingStatus.CONFIRMED) ?? 0,
          pendingBookings: bookingStatuses.get(BookingStatus.PENDING) ?? 0,
          cancelledBookings: bookingStatuses.get(BookingStatus.CANCELLED) ?? 0,
          ticketsIssued,
          validTickets,
          checkedInTickets,
          attendancePercentage: percentage(checkedInTickets, validTickets),
          totalVendorApplications: [...vendorApplicationStatuses.values()].reduce((total, count) => total + count, 0),
        },
        financialSummary: simulatedFinancials,
        paidRevenue: simulatedFinancials.simulatedPaidAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
