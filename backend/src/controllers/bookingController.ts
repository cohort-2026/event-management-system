import { randomUUID } from 'node:crypto';
import { BookingStatus, EventStatus, PaymentStatus, Prisma, PrismaClient, TicketStatus, TicketTypes, TypeOfTickets } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();
const bookingInclude = {
  event: { select: { id: true, title: true, startTime: true, endTime: true, venue: true } },
  eventTicketType: { select: { id: true, name: true, price: true } },
  ticket: true,
} satisfies Prisma.BookingInclude;

class CapacityUnavailableError extends Error {}

const ticketTypeEnum = (name: string): TicketTypes => {
  const normalized = name.trim().toUpperCase();
  return normalized === 'VIP' || normalized === 'STAFF' ? normalized : 'GENERAL';
};

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId.trim() : '';
    const ticketChoice = typeof req.body?.ticketType === 'string' ? req.body.ticketType.trim() : '';
    if (!eventId || !ticketChoice) {
      res.status(400).json({ success: false, message: 'An event and ticket type are required' });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, status: EventStatus.PUBLISHED, startTime: { gt: new Date() } },
      select: { id: true, isFree: true },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Published upcoming event not found' });
      return;
    }

    const ticketType = await prisma.eventTicketType.findFirst({
      where: {
        eventId,
        OR: [
          { id: ticketChoice },
          { name: { equals: ticketChoice, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, price: true },
    });
    if (!ticketType) {
      res.status(404).json({ success: false, message: 'Ticket type not found for this event' });
      return;
    }
    if (Number(ticketType.price) > 0) {
      res.status(409).json({ success: false, message: 'Paid ticket checkout is not available yet' });
      return;
    }

    const booking = await prisma.$transaction(async transaction => {
      const eventCapacity = await transaction.event.updateMany({
        where: { id: eventId, status: EventStatus.PUBLISHED, availableCapacity: { gt: 0 } },
        data: { availableCapacity: { decrement: 1 } },
      });
      if (eventCapacity.count !== 1) throw new CapacityUnavailableError();

      const ticketCapacity = await transaction.eventTicketType.updateMany({
        where: { id: ticketType.id, eventId, availableQuantity: { gt: 0 } },
        data: { availableQuantity: { decrement: 1 } },
      });
      if (ticketCapacity.count !== 1) throw new CapacityUnavailableError();

      return transaction.booking.create({
        data: {
          eventId,
          eventTicketTypeId: ticketType.id,
          attendeeId: req.user!.id,
          ticketType: ticketTypeEnum(ticketType.name),
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.NOT_REQUIRED,
          ticket: {
            create: {
              referenceNumber: `EVT-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
              type: TypeOfTickets.FREE,
              status: TicketStatus.ACTIVE,
              eventId,
              holderId: req.user!.id,
            },
          },
        },
        include: bookingInclude,
      });
    });

    res.status(201).json({ success: true, data: booking, message: 'Booking confirmed.' });
  } catch (error) {
    if (error instanceof CapacityUnavailableError) {
      res.status(409).json({ success: false, message: 'No tickets remain for this event or ticket type' });
      return;
    }
    next(error);
  }
};

export const listMyBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { attendeeId: req.user!.id },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid booking ID is required' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const booking = await transaction.booking.findFirst({
        where: { id, attendeeId: req.user!.id },
        select: {
          id: true,
          eventId: true,
          eventTicketTypeId: true,
          status: true,
          event: { select: { startTime: true } },
        },
      });
      if (!booking) return 'not_found' as const;
      if (booking.status === BookingStatus.CANCELLED) return 'already_cancelled' as const;
      if (booking.event.startTime <= new Date()) return 'started' as const;

      const updated = await transaction.booking.updateMany({
        where: { id, attendeeId: req.user!.id, status: { not: BookingStatus.CANCELLED } },
        data: { status: BookingStatus.CANCELLED },
      });
      if (updated.count !== 1) return 'already_cancelled' as const;

      await transaction.ticket.updateMany({
        where: { bookingId: id, status: TicketStatus.ACTIVE },
        data: { status: TicketStatus.CANCELLED },
      });
      await transaction.event.updateMany({
        where: { id: booking.eventId },
        data: { availableCapacity: { increment: 1 } },
      });
      if (booking.eventTicketTypeId) {
        await transaction.eventTicketType.updateMany({
          where: { id: booking.eventTicketTypeId },
          data: { availableQuantity: { increment: 1 } },
        });
      }
      return 'cancelled' as const;
    });

    if (result === 'not_found') {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }
    if (result === 'started') {
      res.status(409).json({ success: false, message: 'Bookings cannot be cancelled after an event starts' });
      return;
    }
    if (result === 'already_cancelled') {
      res.status(409).json({ success: false, message: 'Booking is already cancelled' });
      return;
    }
    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (error) {
    next(error);
  }
};
