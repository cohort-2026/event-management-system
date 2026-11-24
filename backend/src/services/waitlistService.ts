import { WaitlistStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const activeStatuses = [WaitlistStatus.WAITING, WaitlistStatus.OFFERED];
const isActive = (status: WaitlistStatus): boolean => activeStatuses.includes(status as typeof activeStatuses[number]);

/** READ COMMITTED plus the ticket row lock makes later statements see the latest queue. */
export const joinWaitlist = async (eventId: string, ticketTypeId: string, attendeeId: string) =>
  prisma.$transaction(async transaction => {
    const [ticket] = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "event_ticket_types" WHERE "id" = ${ticketTypeId} FOR UPDATE
    `;
    if (!ticket) return { kind: 'ticket_missing' as const };

    const event = await transaction.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, status: true, startTime: true },
    });
    if (!event) return { kind: 'event_missing' as const };
    const ticketType = await transaction.eventTicketType.findFirst({
      where: { id: ticketTypeId, eventId },
      select: { id: true, name: true, availableQuantity: true },
    });
    if (!ticketType) return { kind: 'ticket_mismatch' as const };
    if (event.status !== 'PUBLISHED' || event.startTime <= new Date()) return { kind: 'event_unavailable' as const };
    if (ticketType.availableQuantity > 0) return { kind: 'not_sold_out' as const };

    const duplicate = await transaction.waitlistEntry.findFirst({
      where: { eventId, ticketTypeId, attendeeId, status: { in: activeStatuses } },
    });
    if (duplicate) return { kind: 'duplicate' as const };
    const last = await transaction.waitlistEntry.aggregate({
      where: { eventId, ticketTypeId, status: { in: activeStatuses } },
      _max: { position: true },
    });
    const entry = await transaction.waitlistEntry.create({
      data: { eventId, ticketTypeId, attendeeId, position: (last._max.position ?? 0) + 1 },
      include: { event: { select: { id: true, title: true, date: true, startTime: true, venue: true, bannerImageUrl: true } }, ticketType: { select: { id: true, name: true } } },
    });
    return { kind: 'created' as const, entry };
  });

export const getPosition = async (entryId: string, attendeeId: string, isAdmin: boolean) => {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: {
      event: { select: { id: true, title: true, date: true, startTime: true, endTime: true, venue: true, bannerImageUrl: true } },
      ticketType: { select: { id: true, name: true } },
    },
  });
  if (!entry) return { kind: 'missing' as const };
  if (!isAdmin && entry.attendeeId !== attendeeId) return { kind: 'forbidden' as const };
  if (!isActive(entry.status)) return { kind: 'found' as const, entry, position: entry.position };
  const preceding = await prisma.waitlistEntry.count({
    where: { eventId: entry.eventId, ticketTypeId: entry.ticketTypeId, status: { in: activeStatuses }, OR: [
      { position: { lt: entry.position } },
      { position: entry.position, createdAt: { lt: entry.createdAt } },
      { position: entry.position, createdAt: entry.createdAt, id: { lt: entry.id } },
    ] },
  });
  return { kind: 'found' as const, entry, position: preceding + 1 };
};

export const cancelWaitlistEntry = async (entryId: string, attendeeId: string, isAdmin: boolean) =>
  prisma.$transaction(async transaction => {
    const current = await transaction.waitlistEntry.findUnique({ where: { id: entryId }, select: { id: true, eventId: true, ticketTypeId: true, attendeeId: true, status: true } });
    if (!current) return 'missing' as const;
    if (!isAdmin && current.attendeeId !== attendeeId) return 'forbidden' as const;
    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "event_ticket_types" WHERE "id" = ${current.ticketTypeId} FOR UPDATE
    `;
    if (current.status === WaitlistStatus.CLAIMED) return 'claimed' as const;
    if (!isActive(current.status)) return 'inactive' as const;
    await transaction.waitlistEntry.update({ where: { id: entryId }, data: { status: WaitlistStatus.CANCELLED, cancelledAt: new Date() } });
    // Keep the active queue compact; OFFERED entries remain in place and cannot be bypassed.
    const active = await transaction.waitlistEntry.findMany({
      where: { eventId: current.eventId, ticketTypeId: current.ticketTypeId, status: { in: activeStatuses } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    for (const [index, entry] of active.entries()) {
      await transaction.waitlistEntry.update({ where: { id: entry.id }, data: { position: index + 1 } });
    }
    return 'cancelled' as const;
  });

