import { randomUUID } from 'node:crypto';
import {
  BookingStatus,
  EventStatus,
  PaymentStatus,
  PrismaClient,
  TicketStatus,
  TicketTypes,
  TypeOfTickets,
} from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

const prisma = new PrismaClient();

type BookingErrorCode =
  | 'ticket_not_found'
  | 'registration_closed'
  | 'paid_checkout_unavailable'
  | 'sold_out'
  | 'already_booked';

class BookingRequestError extends Error {
  constructor(readonly code: BookingErrorCode) {
    super(code);
  }
}

const responseByError: Record<BookingErrorCode, readonly [number, string]> = {
  ticket_not_found: [404, 'Ticket type not found'],
  registration_closed: [409, 'Registration is closed for this event'],
  paid_checkout_unavailable: [503, 'Paid ticket checkout is not available yet'],
  sold_out: [409, 'This ticket type is fully booked'],
  already_booked: [409, 'You already have a booking for this event'],
};

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown> | null;
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    const ticketTypeId = typeof body?.ticketTypeId === 'string' ? body.ticketTypeId.trim() : '';
    if (!eventId || !ticketTypeId) {
      res.status(400).json({ success: false, message: 'Choose an event and ticket type' });
      return;
    }

    const now = new Date();
    const result = await prisma.$transaction(async transaction => {
      const ticketType = await transaction.eventTicketType.findFirst({
        where: { id: ticketTypeId, eventId },
        include: { event: true },
      });
      if (!ticketType) return { error: 'ticket_not_found' as const };
      if (ticketType.event.status !== EventStatus.PUBLISHED ||
          ticketType.event.startTime <= now || ticketType.event.endTime <= now) {
        return { error: 'registration_closed' as const };
      }
      if (ticketType.bookingDeadline && ticketType.bookingDeadline <= now) {
        return { error: 'registration_closed' as const };
      }
      if (Number(ticketType.price) > 0) return { error: 'paid_checkout_unavailable' as const };
      if (ticketType.availableQuantity <= 0 || ticketType.event.availableCapacity <= 0) {
        return { error: 'sold_out' as const };
      }

      const existingBooking = await transaction.booking.findFirst({
        where: {
          eventId,
          attendeeId: req.user!.id,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        },
        select: { id: true },
      });
      if (existingBooking) return { error: 'already_booked' as const };

      const ticketReserved = await transaction.eventTicketType.updateMany({
        where: { id: ticketTypeId, eventId, availableQuantity: { gt: 0 } },
        data: { availableQuantity: { decrement: 1 } },
      });
      if (ticketReserved.count !== 1) throw new BookingRequestError('sold_out');

      const eventReserved = await transaction.event.updateMany({
        where: {
          id: eventId,
          status: EventStatus.PUBLISHED,
          startTime: { gt: now },
          endTime: { gt: now },
          availableCapacity: { gt: 0 },
        },
        data: { availableCapacity: { decrement: 1 } },
      });
      if (eventReserved.count !== 1) throw new BookingRequestError('registration_closed');

      const booking = await transaction.booking.create({
        data: {
          eventId,
          attendeeId: req.user!.id,
          eventTicketTypeId: ticketTypeId,
          ticketType: TicketTypes.GENERAL,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.NOT_REQUIRED,
          ticket: {
            create: {
              referenceNumber: randomUUID().replaceAll('-', '').toUpperCase(),
              type: TypeOfTickets.FREE,
              status: TicketStatus.ACTIVE,
              eventId,
              holderId: req.user!.id,
            },
          },
        },
        include: { ticket: true, eventTicketType: true },
      });
      return { booking };
    }).catch(error => {
      if (error instanceof BookingRequestError) return { error: error.code };
      throw error;
    });

    if ('error' in result && result.error) {
      const [status, message] = responseByError[result.error];
      res.status(status).json({ success: false, message });
      return;
    }
    if (!('booking' in result)) {
      throw new Error('Booking transaction did not return a result');
    }

    res.status(201).json({
      success: true,
      data: result.booking,
      message: 'Your RSVP is confirmed.',
    });
  } catch (error) {
    next(error);
  }
};
