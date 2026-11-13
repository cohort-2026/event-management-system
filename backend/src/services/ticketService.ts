import { randomUUID } from 'node:crypto';
import { Prisma, TicketStatus, TypeOfTickets } from '@prisma/client';

export class TicketsAlreadyIssuedError extends Error {}

export const issueTicketsForBooking = async (
  transaction: Prisma.TransactionClient,
  booking: {
    id: string;
    eventId: string;
    holderId: string;
    quantity: number;
    type: TypeOfTickets;
  },
) => {
  const existingCount = await transaction.ticket.count({ where: { bookingId: booking.id } });
  if (existingCount > 0) throw new TicketsAlreadyIssuedError();

  await transaction.ticket.createMany({
    data: Array.from({ length: booking.quantity }, () => ({
      referenceNumber: `EVT-${randomUUID().replace(/-/g, '').toUpperCase()}`,
      qrPayload: `QR-${randomUUID().replace(/-/g, '')}`,
      type: booking.type,
      status: TicketStatus.ACTIVE,
      bookingId: booking.id,
      eventId: booking.eventId,
      holderId: booking.holderId,
    })),
  });

  return transaction.ticket.findMany({
    where: { bookingId: booking.id },
    orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
  });
};
