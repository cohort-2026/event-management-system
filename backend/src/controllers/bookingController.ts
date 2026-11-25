import { randomUUID } from 'node:crypto';
import { BookingStatus, EventStatus, PaymentStatus, Prisma, TicketStatus, TicketTypes, TypeOfTickets } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { isUuid } from '../middleware/requestValidation';
import {
  notifyAttendeeBookingConfirmed,
  notifyOrganizerBookingCancelled,
} from '../services/notificationService';

import { issueTicketsForBooking } from '../services/ticketService';
import { sendBookingConfirmationOnce } from '../services/bookingConfirmationService';
import { offerNextWaitlist } from '../services/waitlistService';

const MAX_TICKETS_PER_BOOKING = 100;
const MAX_BOOKING_AMOUNT = new Prisma.Decimal('99999999.99');

const bookingInclude = {
  event: { select: { id: true, title: true, category: true, bannerImageUrl: true, startTime: true, endTime: true, venue: true } },
  eventTicketType: { select: { id: true, name: true, price: true } },
  tickets: {
    select: {
      id: true,
      referenceNumber: true,
      type: true,
      status: true,
      issuedAt: true,
    },
  },
  payment: { select: { amount: true, currency: true, status: true, provider: true, providerReference: true, createdAt: true } },
} satisfies Prisma.BookingInclude;

class CapacityUnavailableError extends Error {}
class EventUnavailableError extends Error {}
class TicketTypeUnavailableError extends Error {}
class BookingAmountLimitError extends Error {}


const ticketTypeEnum = (name: string): TicketTypes => {
  const normalized = name.trim().toUpperCase();
  return normalized === 'VIP' || normalized === 'STAFF' ? normalized : 'GENERAL';
};

const serializeBooking = (booking: Prisma.BookingGetPayload<{ include: typeof bookingInclude }>) => ({
  ...booking,
  totalAmount: Number(booking.totalAmount),
  eventTicketType: booking.eventTicketType
    ? { ...booking.eventTicketType, price: Number(booking.eventTicketType.price) }
    : null,
  ticket: booking.tickets[0] ?? null,
});

const bookingReference = (): string => `BKG-${randomUUID().replace(/-/g, '').toUpperCase()}`;

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId.trim() : '';
    const explicitTicketTypeId = typeof req.body?.ticketTypeId === 'string'
      ? req.body.ticketTypeId.trim()
      : '';
    const legacyTicketChoice = typeof req.body?.ticketType === 'string'
      ? req.body.ticketType.trim()
      : '';
    const ticketChoice = explicitTicketTypeId || legacyTicketChoice;
    const quantity = req.body?.quantity === undefined ? 1 : req.body.quantity;
    if (!isUuid(eventId)) {
      res.status(400).json({
        success: false,
        message: 'A valid event ID is required',
        errors: [{ field: 'eventId', message: 'Must be a valid UUID' }],
      });
      return;
    }
    if (explicitTicketTypeId && !isUuid(explicitTicketTypeId)) {
      res.status(400).json({
        success: false,
        message: 'A valid ticket type ID is required',
        errors: [{ field: 'ticketTypeId', message: 'Must be a valid UUID' }],
      });
      return;
    }
    if (!ticketChoice) {
      res.status(400).json({
        success: false,
        message: 'A ticket type is required',
        errors: [{ field: 'ticketTypeId', message: 'Required' }],
      });
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_TICKETS_PER_BOOKING) {
      res.status(400).json({
        success: false,
        message: 'Invalid ticket quantity',
        errors: [{
          field: 'quantity',
          message: `Must be a positive integer no greater than ${MAX_TICKETS_PER_BOOKING}`,
        }],
      });
      return;
    }

    const booking = await prisma.$transaction(async transaction => {
      const now = new Date();
      const event = await transaction.event.findFirst({
        where: {
          id: eventId,
          status: EventStatus.PUBLISHED,
          startTime: { gt: now },
          AND: [
            { OR: [{ registrationOpensAt: null }, { registrationOpensAt: { lte: now } }] },
            { OR: [{ registrationClosesAt: null }, { registrationClosesAt: { gt: now } }] },
          ],
        },
        select: { id: true, title: true, availableCapacity: true },
      });
      if (!event) throw new EventUnavailableError();

      const ticketType = await transaction.eventTicketType.findFirst({
        where: explicitTicketTypeId
          ? { id: explicitTicketTypeId, eventId }
          : {
            eventId,
            OR: [
              { id: ticketChoice },
              { name: { equals: ticketChoice, mode: 'insensitive' } },
            ],
          },
        select: { id: true, name: true, price: true, availableQuantity: true },
      });
      if (!ticketType || Number(ticketType.price) < 0) throw new TicketTypeUnavailableError();
      if (event.availableCapacity < quantity || ticketType.availableQuantity < quantity) {
        throw new CapacityUnavailableError();
      }

      const totalAmount = new Prisma.Decimal(ticketType.price).mul(quantity);
      if (totalAmount.greaterThan(MAX_BOOKING_AMOUNT)) {
        throw new BookingAmountLimitError();
      }
      const isFree = totalAmount.isZero();
      if (isFree) {
        const eventCapacity = await transaction.event.updateMany({
          where: {
            id: eventId,
            status: EventStatus.PUBLISHED,
            availableCapacity: { gte: quantity },
          },
          data: { availableCapacity: { decrement: quantity } },
        });
        if (eventCapacity.count !== 1) throw new CapacityUnavailableError();

        const ticketCapacity = await transaction.eventTicketType.updateMany({
          where: {
            id: ticketType.id,
            eventId,
            price: ticketType.price,
            availableQuantity: { gte: quantity },
          },
          data: { availableQuantity: { decrement: quantity } },
        });
        if (ticketCapacity.count !== 1) throw new CapacityUnavailableError();
      }

      const createdBooking = await transaction.booking.create({
        data: {
          reference: bookingReference(),
          ticketAccessToken: randomUUID(),
          quantity,
          totalAmount,
          eventId,
          eventTicketTypeId: ticketType.id,
          attendeeId: req.user!.id,
          ticketType: ticketTypeEnum(ticketType.name),
          status: isFree ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
          paymentStatus: isFree ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING,
          ...(!isFree
            ? {
              payment: {
                create: {
                  amount: totalAmount,
                  status: PaymentStatus.PENDING,
                  provider: 'SIMULATED',
                },
              },
            }
            : {}),
        },
      });
      if (isFree) {
        await issueTicketsForBooking(transaction, {
          id: createdBooking.id,
          eventId,
          holderId: req.user!.id,
          quantity,
          type: TypeOfTickets.FREE,
        });
        await notifyAttendeeBookingConfirmed(
          transaction,
          req.user!.id,
          event.title,
          createdBooking.reference,
        );
      }

      return transaction.booking.findUniqueOrThrow({
        where: { id: createdBooking.id },
        include: bookingInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (booking.status === BookingStatus.CONFIRMED) {
      try {
        await sendBookingConfirmationOnce(booking.id);
      } catch (emailError) {
        console.error('Attendee booking confirmation email processing failed:', booking.reference, emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: serializeBooking(booking),
      message: booking.paymentStatus === PaymentStatus.PENDING
        ? 'Booking created; payment is pending and ticket capacity is not reserved until payment succeeds.'
        : 'Booking confirmed.',
    });
  } catch (error) {
    if (error instanceof CapacityUnavailableError) {
      res.status(409).json({ success: false, message: 'No tickets remain for this event or ticket type' });
      return;
    }
    if (error instanceof EventUnavailableError) {
      res.status(404).json({ success: false, message: 'Published upcoming event not found' });
      return;
    }
    if (error instanceof TicketTypeUnavailableError) {
      res.status(404).json({ success: false, message: 'Ticket type not found for this event' });
      return;
    }
    if (error instanceof BookingAmountLimitError) {
      res.status(400).json({
        success: false,
        message: 'The booking total exceeds the supported payment amount',
        errors: [{ field: 'quantity', message: 'Reduce the number of tickets' }],
      });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json({ success: false, message: 'Availability changed; retry the booking' });
      return;
    }
    next(error);
  }
};

export const listMyBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const where = { attendeeId: req.user!.id };
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);
    res.json({
      success: true,
      data: bookings.map(serializeBooking),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason || reason.length > 500) {
      res.status(400).json({ success: false, message: 'A cancellation reason of up to 500 characters is required' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "tickets"
        WHERE "booking_id" = ${id}
        ORDER BY "id"
        FOR UPDATE
      `;
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "bookings" WHERE "id" = ${id} FOR UPDATE
      `;
      const booking = await transaction.booking.findFirst({
        where: { id, attendeeId: req.user!.id },
        select: {
          id: true,
          reference: true,
          eventId: true,
          eventTicketTypeId: true,
          quantity: true,
          status: true,
          paymentStatus: true,
          cancelledAt: true,
          payment: { select: { provider: true } },
          tickets: { select: { status: true } },
          event: { select: { startTime: true, title: true, organizerId: true } },
        },
      });
      if (!booking) return 'not_found' as const;
      if (booking.status === BookingStatus.CANCELLED) return 'already_cancelled' as const;
      if (booking.event.startTime <= new Date()) return 'started' as const;
      if (booking.tickets.some(ticket => ticket.status === TicketStatus.USED)) return 'checked_in' as const;

      const cancelledAt = new Date();

      const abandonedPayment = booking.paymentStatus === PaymentStatus.PENDING
        ? await transaction.payment.updateMany({
          where: {
            bookingId: id,
            status: PaymentStatus.PENDING,
            provider: booking.payment?.provider ?? 'SIMULATED',
          },
          data: {
            status: PaymentStatus.FAILED,
            providerReference: `${booking.payment?.provider ?? 'SIMULATED'}-CANCELLED`,
          },
        })
        : { count: 0 };
      const updated = await transaction.booking.updateMany({
        where: { id, attendeeId: req.user!.id, status: booking.status },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt,
          cancellationReason: reason,
          cancelledById: req.user!.id,
          ...(abandonedPayment.count > 0 ? { paymentStatus: PaymentStatus.FAILED } : {}),
        },
      });
      if (updated.count !== 1) return 'already_cancelled' as const;

      await transaction.ticket.updateMany({
        where: { bookingId: id, status: TicketStatus.ACTIVE },
        data: { status: TicketStatus.CANCELLED },
      });
      const releasedQuantity = booking.status === BookingStatus.CONFIRMED ? booking.quantity : 0;
      if (releasedQuantity > 0) {
        await transaction.event.updateMany({
          where: { id: booking.eventId },
          data: { availableCapacity: { increment: releasedQuantity } },
        });
        if (booking.eventTicketTypeId) {
          await transaction.eventTicketType.updateMany({
            where: { id: booking.eventTicketTypeId },
            data: { availableQuantity: { increment: releasedQuantity } },
          });
        }
      }
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: req.user!.id,
          action: 'BOOKING_CANCELLED',
          outcome: 'cancelled',
          metadata: {
            bookingId: booking.id,
            bookingReference: booking.reference,
            eventId: booking.eventId,
            ticketTypeId: booking.eventTicketTypeId,
            attendeeId: req.user!.id,
            previousStatus: booking.status,
            newStatus: BookingStatus.CANCELLED,
            cancellationReason: reason,
            cancelledAt: cancelledAt.toISOString(),
            releasedQuantity,
          },
        },
      });
      await notifyOrganizerBookingCancelled(
        transaction,
        booking.event.organizerId,
        booking.eventId,
        booking.event.title,
        booking.reference,
        reason,
      );
      return {
        kind: 'cancelled' as const,
        booking: await transaction.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude }),
        inventoryRelease: {
          eventId: booking.eventId,
          ticketTypeId: booking.eventTicketTypeId,
          quantity: releasedQuantity,
        },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (typeof result !== 'string' && result.kind === 'cancelled' && result.inventoryRelease.quantity > 0 && result.inventoryRelease.ticketTypeId) {
      await offerNextWaitlist(result.inventoryRelease.eventId, result.inventoryRelease.ticketTypeId, result.inventoryRelease.quantity);
    }

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
    if (result === 'checked_in') {
      res.status(409).json({ success: false, message: 'Bookings with checked-in tickets cannot be cancelled' });
      return;
    }
    if (typeof result !== 'string' && result.kind === 'cancelled') {
      res.json({
        success: true,
        data: { ...serializeBooking(result.booking), inventoryRelease: result.inventoryRelease },
        message: 'Booking cancelled. Completed simulated payments are not refunded.',
      });
      return;
    }
    res.json({
      success: true,
      message: 'Booking cancelled.',
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json({ success: false, message: 'Booking changed; reload and try again' });
      return;
    }
    next(error);
  }
};
