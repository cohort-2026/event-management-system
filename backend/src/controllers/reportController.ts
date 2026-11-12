import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

export const getEventReport = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        startTime: true,
        endTime: true,
        organizer: { select: { id: true, firstname: true, lastname: true, email: true } },
        _count: { select: { bookings: true, tickets: true, vendorApplications: true } },
      },
      orderBy: { startTime: 'desc' },
    });
    const [statusCounts, bookingCounts, paidRevenue] = await Promise.all([
      prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        events,
        statusCounts: statusCounts.map(({ status, _count }) => ({ status, count: _count._all })),
        bookingCounts: bookingCounts.map(({ status, _count }) => ({ status, count: _count._all })),
        paidRevenue: Number(paidRevenue._sum.amount ?? 0),
      },
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
      include: {
        organizer: { select: { id: true, firstname: true, lastname: true, email: true } },
        _count: { select: { bookings: true, tickets: true, vendorApplications: true } },
      },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const [bookingsByStatus, paymentsByStatus, paidRevenue, vendorApplicationsByStatus] = await Promise.all([
      prisma.booking.groupBy({ by: ['status'], where: { eventId: id }, _count: { _all: true } }),
      prisma.payment.groupBy({
        by: ['status'],
        where: { booking: { is: { eventId: id } } },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { booking: { is: { eventId: id } }, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.vendorApplication.groupBy({ by: ['status'], where: { eventId: id }, _count: { _all: true } }),
    ]);

    res.json({
      success: true,
      data: {
        event,
        bookingsByStatus: bookingsByStatus.map(({ status, _count }) => ({ status, count: _count._all })),
        paymentsByStatus: paymentsByStatus.map(({ status, _count }) => ({ status, count: _count._all })),
        vendorApplicationsByStatus: vendorApplicationsByStatus.map(({ status, _count }) => ({ status, count: _count._all })),
        paidRevenue: Number(paidRevenue._sum.amount ?? 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
