import {
  BookingStatus,
  EventStatus,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';

export type TicketCheckInResult =
  | { kind: 'not_found' }
  | { kind: 'already_used' }
  | { kind: 'invalid_ticket' }
  | { kind: 'invalid_booking' }
  | { kind: 'event_not_in_progress' }
  | {
    kind: 'checked_in';
    ticket: {
      id: string;
      referenceNumber: string;
      status: TicketStatus;
      checkedInAt: Date;
      event: { title: string };
    };
  };

type TicketLookup = { ticketId: string; qrPayload?: never } | { qrPayload: string; ticketId?: never };

export const checkInTicketForOrganizer = async (
  lookup: TicketLookup,
  organizerId: string,
): Promise<TicketCheckInResult> => prisma.$transaction(async transaction => {
  const rows = 'ticketId' in lookup
    ? await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "tickets" WHERE "id" = ${lookup.ticketId} FOR UPDATE
    `
    : await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "tickets" WHERE "qr_payload" = ${lookup.qrPayload} FOR UPDATE
    `;
  const ticketId = rows[0]?.id;
  if (!ticketId) return { kind: 'not_found' };

  const identity = await transaction.ticket.findUnique({
    where: { id: ticketId },
    select: {
      bookingId: true,
      eventId: true,
      event: { select: { organizerId: true } },
    },
  });
  if (!identity || identity.event.organizerId !== organizerId) return { kind: 'not_found' };

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "bookings" WHERE "id" = ${identity.bookingId} FOR UPDATE
  `;
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "events" WHERE "id" = ${identity.eventId} FOR UPDATE
  `;

  const ticket = await transaction.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      referenceNumber: true,
      eventId: true,
      holderId: true,
      status: true,
      checkedInAt: true,
      event: {
        select: {
          title: true,
          status: true,
          startTime: true,
          endTime: true,
          organizerId: true,
        },
      },
      booking: {
        select: {
          eventId: true,
          attendeeId: true,
          status: true,
          paymentStatus: true,
          payment: { select: { status: true } },
        },
      },
    },
  });
  if (!ticket || ticket.event.organizerId !== organizerId) return { kind: 'not_found' };
  if (ticket.status === TicketStatus.USED) return { kind: 'already_used' };
  if (ticket.status !== TicketStatus.ACTIVE || ticket.checkedInAt !== null) {
    return { kind: 'invalid_ticket' };
  }
  if (
    ticket.booking.eventId !== ticket.eventId ||
    ticket.booking.attendeeId !== ticket.holderId ||
    ticket.booking.status !== BookingStatus.CONFIRMED ||
    !(
      ticket.booking.paymentStatus === PaymentStatus.NOT_REQUIRED ||
      (
        ticket.booking.paymentStatus === PaymentStatus.PAID &&
        ticket.booking.payment?.status === PaymentStatus.PAID
      )
    )
  ) {
    return { kind: 'invalid_booking' };
  }
  const now = new Date();
  if (
    ticket.event.status !== EventStatus.PUBLISHED ||
    ticket.event.startTime > now ||
    ticket.event.endTime < now
  ) {
    return { kind: 'event_not_in_progress' };
  }

  const updated = await transaction.ticket.updateMany({
    where: {
      id: ticket.id,
      status: TicketStatus.ACTIVE,
      checkedInAt: null,
    },
    data: {
      status: TicketStatus.USED,
      checkedInAt: now,
    },
  });
  if (updated.count !== 1) return { kind: 'already_used' };

  return {
    kind: 'checked_in',
    ticket: {
      id: ticket.id,
      referenceNumber: ticket.referenceNumber,
      status: TicketStatus.USED,
      checkedInAt: now,
      event: { title: ticket.event.title },
    },
  };
});

export const isValidQrPayload = (value: string): boolean =>
  value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
