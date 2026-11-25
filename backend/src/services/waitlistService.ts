import { BookingStatus, EventStatus, PaymentStatus, Prisma, TypeOfTickets, WaitlistStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { issueTicketsForBooking } from './ticketService';
import { notifyAttendeeBookingConfirmed } from './notificationService';
import { sendWaitlistOfferNotification } from './emailService';

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

export const offerNextWaitlist = async (eventId: string, ticketTypeId: string, quantity: number) => {
  const offered: string[] = [];
  for (let i = 0; i < quantity; i += 1) {
    const entry = await prisma.$transaction(async transaction => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "event_ticket_types" WHERE "id" = ${ticketTypeId} FOR UPDATE
      `;
      const next = await transaction.waitlistEntry.findFirst({
        where: { eventId, ticketTypeId, status: WaitlistStatus.WAITING },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        include: { attendee: { select: { id: true, email: true, firstname: true } }, event: { select: { title: true } }, ticketType: { select: { name: true } } },
      });
      if (!next) return null;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const updated = await transaction.waitlistEntry.updateMany({
        where: { id: next.id, status: WaitlistStatus.WAITING },
        data: { status: WaitlistStatus.OFFERED, offeredAt: now, expiresAt },
      });
      if (updated.count !== 1) return null;
      const ticketReserved = await transaction.eventTicketType.updateMany({
        where: { id: ticketTypeId, eventId, availableQuantity: { gte: 1 } },
        data: { availableQuantity: { decrement: 1 } },
      });
      const eventReserved = await transaction.event.updateMany({
        where: { id: eventId, availableCapacity: { gte: 1 } },
        data: { availableCapacity: { decrement: 1 } },
      });
      if (ticketReserved.count !== 1 || eventReserved.count !== 1) {
        throw new Error('Ticket inventory could not be reserved for the waitlist offer');
      }
      await transaction.notification.create({ data: {
        recipientId: next.attendeeId,
        title: 'A waitlist ticket is available',
        message: `A ${next.ticketType.name} ticket for ${next.event.title} is available. Claim it before ${expiresAt.toISOString()}.`,
        link: '/attendee/dashboard',
      } });
      return { ...next, expiresAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!entry) break;
    offered.push(entry.id);
    try {
      await sendWaitlistOfferNotification({
        email: entry.attendee.email,
        firstname: entry.attendee.firstname,
        eventTitle: entry.event.title,
        ticketType: entry.ticketType.name,
        expiresAt: entry.expiresAt,
      });
    } catch (error) {
      // The in-app notification and reserved offer remain valid; email failure is logged for operations.
      console.error('Waitlist offer email failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  return offered;
};

export const claimWaitlistOffer = async (entryId: string, attendeeId: string) => prisma.$transaction(async transaction => {
  const snapshot = await transaction.waitlistEntry.findUnique({ where: { id: entryId }, select: { id: true, ticketTypeId: true } });
  if (!snapshot) return { kind: 'missing' as const };
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "event_ticket_types" WHERE "id" = ${snapshot.ticketTypeId} FOR UPDATE
  `;
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "waitlist_entries" WHERE "id" = ${entryId} FOR UPDATE
  `;
  const entry = await transaction.waitlistEntry.findUnique({
    where: { id: entryId },
    include: {
      event: { select: { id: true, title: true, status: true, startTime: true } },
      ticketType: { select: { id: true, name: true, price: true } },
      booking: { select: { id: true, reference: true, status: true, paymentStatus: true } },
    },
  });
  if (!entry) return { kind: 'missing' as const };
  if (entry.attendeeId !== attendeeId) return { kind: 'forbidden' as const };
  if (entry.status === WaitlistStatus.CLAIMED && entry.booking) return { kind: 'claimed' as const, booking: entry.booking };
  if (entry.status !== WaitlistStatus.OFFERED) return { kind: 'inactive' as const };
  if (!entry.expiresAt || entry.expiresAt <= new Date()) return { kind: 'expired' as const };
  if (entry.event.status !== EventStatus.PUBLISHED || entry.event.startTime <= new Date()) return { kind: 'event_unavailable' as const };
  if (entry.booking) {
    if (entry.booking.status === BookingStatus.PENDING && entry.booking.paymentStatus === PaymentStatus.FAILED) {
      await transaction.booking.update({ where: { id: entry.booking.id }, data: { paymentStatus: PaymentStatus.PENDING } });
      await transaction.payment.updateMany({ where: { bookingId: entry.booking.id, status: PaymentStatus.FAILED }, data: { status: PaymentStatus.PENDING, providerReference: null } });
      return { kind: 'payment_required' as const, booking: { ...entry.booking, paymentStatus: PaymentStatus.PENDING } };
    }
    return { kind: 'pending_payment' as const, booking: entry.booking };
  }

  const amount = new Prisma.Decimal(entry.ticketType.price);
  const isFree = amount.isZero();
  const reference = `BKG-${randomUUID().replace(/-/g, '').toUpperCase()}`;
  const booking = await transaction.booking.create({
    data: {
      reference,
      ticketAccessToken: randomUUID(),
      quantity: 1,
      totalAmount: amount,
      eventId: entry.eventId,
      eventTicketTypeId: entry.ticketTypeId,
      attendeeId,
      waitlistEntryId: entry.id,
      ticketType: entry.ticketType.name.trim().toUpperCase() === 'VIP' ? 'VIP' : entry.ticketType.name.trim().toUpperCase() === 'STAFF' ? 'STAFF' : 'GENERAL',
      status: isFree ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      paymentStatus: isFree ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING,
      ...(!isFree ? { payment: { create: { amount, status: PaymentStatus.PENDING, provider: 'SIMULATED' } } } : {}),
    },
  });
  if (isFree) {
    await issueTicketsForBooking(transaction, { id: booking.id, eventId: entry.eventId, holderId: attendeeId, quantity: 1, type: TypeOfTickets.FREE });
    await transaction.waitlistEntry.update({ where: { id: entry.id }, data: { status: WaitlistStatus.CLAIMED, claimedAt: new Date() } });
    await notifyAttendeeBookingConfirmed(transaction, attendeeId, entry.event.title, booking.reference);
    return { kind: 'claimed' as const, booking: { id: booking.id, reference: booking.reference, status: booking.status, paymentStatus: booking.paymentStatus } };
  }
  return { kind: 'payment_required' as const, booking: { id: booking.id, reference: booking.reference, status: booking.status, paymentStatus: booking.paymentStatus } };
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

export const recoverAvailableWaitlistOffers = async (batchSize = 50): Promise<number> => {
  const waiting = await prisma.waitlistEntry.findMany({
    where: { status: WaitlistStatus.WAITING },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: batchSize,
    distinct: ['eventId', 'ticketTypeId'],
    select: { eventId: true, ticketTypeId: true },
  });
  let created = 0;
  for (const group of waiting) {
    const [ticketType, event] = await Promise.all([
      prisma.eventTicketType.findUnique({ where: { id: group.ticketTypeId }, select: { availableQuantity: true } }),
      prisma.event.findUnique({ where: { id: group.eventId }, select: { availableCapacity: true, status: true, startTime: true } }),
    ]);
    if (!ticketType || !event || event.status !== EventStatus.PUBLISHED || event.startTime <= new Date()) continue;
    const quantity = Math.min(ticketType.availableQuantity, event.availableCapacity);
    if (quantity > 0) created += (await offerNextWaitlist(group.eventId, group.ticketTypeId, quantity)).length;
  }
  return created;
};

export const expireWaitlistOffers = async (batchSize = 50): Promise<number> => {
  const expired = await prisma.waitlistEntry.findMany({
    where: { status: WaitlistStatus.OFFERED, expiresAt: { lte: new Date() } },
    orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    take: batchSize,
    select: { id: true },
  });
  let processed = 0;
  for (const candidate of expired) {
    const result = await prisma.$transaction(async transaction => {
      const current = await transaction.waitlistEntry.findUnique({ where: { id: candidate.id }, select: { id: true, eventId: true, ticketTypeId: true, attendeeId: true, status: true, expiresAt: true } });
      if (!current || current.status !== WaitlistStatus.OFFERED || !current.expiresAt || current.expiresAt > new Date()) return null;
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "event_ticket_types" WHERE "id" = ${current.ticketTypeId} FOR UPDATE
      `;
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "waitlist_entries" WHERE "id" = ${current.id} FOR UPDATE
      `;
      const updated = await transaction.waitlistEntry.updateMany({ where: { id: current.id, status: WaitlistStatus.OFFERED, expiresAt: { lte: new Date() } }, data: { status: WaitlistStatus.EXPIRED } });
      if (updated.count !== 1) return null;
      const pendingBooking = await transaction.booking.findUnique({ where: { waitlistEntryId: current.id }, select: { id: true, status: true, payment: { select: { id: true, status: true } } } });
      if (pendingBooking && pendingBooking.status === BookingStatus.PENDING) {
        await transaction.booking.update({ where: { id: pendingBooking.id }, data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Waitlist offer expired before payment completion' } });
        if (pendingBooking.payment?.status === PaymentStatus.PENDING) {
          await transaction.payment.update({ where: { id: pendingBooking.payment.id }, data: { status: PaymentStatus.FAILED, providerReference: 'WAITLIST-OFFER-EXPIRED' } });
        }
      }
      await transaction.eventTicketType.update({ where: { id: current.ticketTypeId }, data: { availableQuantity: { increment: 1 } } });
      await transaction.event.update({ where: { id: current.eventId }, data: { availableCapacity: { increment: 1 } } });
      await transaction.notification.create({ data: { recipientId: current.attendeeId, title: 'Waitlist offer expired', message: 'Your 24-hour waitlist offer has expired.', link: '/attendee/dashboard' } });
      return { eventId: current.eventId, ticketTypeId: current.ticketTypeId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result) {
      processed += 1;
      try { await offerNextWaitlist(result.eventId, result.ticketTypeId, 1); }
      catch (error) { console.error('Could not advance expired waitlist offer:', error instanceof Error ? error.message : 'Unknown error'); }
    }
  }
  return processed;
};

export const cancelWaitlistEntry = async (entryId: string, attendeeId: string, isAdmin: boolean) => {
  const result = await prisma.$transaction(async transaction => {
    const current = await transaction.waitlistEntry.findUnique({ where: { id: entryId }, select: { id: true, eventId: true, ticketTypeId: true, attendeeId: true, status: true } });
    if (!current) return { kind: 'missing' as const };
    if (!isAdmin && current.attendeeId !== attendeeId) return { kind: 'forbidden' as const };
    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "event_ticket_types" WHERE "id" = ${current.ticketTypeId} FOR UPDATE
    `;
    if (current.status === WaitlistStatus.CLAIMED) return { kind: 'claimed' as const };
    if (!isActive(current.status)) return { kind: 'inactive' as const };
    await transaction.waitlistEntry.update({ where: { id: entryId }, data: { status: WaitlistStatus.CANCELLED, cancelledAt: new Date() } });
    if (current.status === WaitlistStatus.OFFERED) {
      const pendingBooking = await transaction.booking.findUnique({ where: { waitlistEntryId: entryId }, select: { id: true, status: true, payment: { select: { id: true, status: true } } } });
      if (pendingBooking?.status === BookingStatus.PENDING) {
        await transaction.booking.update({ where: { id: pendingBooking.id }, data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Attendee cancelled the waitlist offer' } });
        if (pendingBooking.payment?.status === PaymentStatus.PENDING) await transaction.payment.update({ where: { id: pendingBooking.payment.id }, data: { status: PaymentStatus.FAILED, providerReference: 'WAITLIST-OFFER-CANCELLED' } });
      }
      await transaction.eventTicketType.update({ where: { id: current.ticketTypeId }, data: { availableQuantity: { increment: 1 } } });
      await transaction.event.update({ where: { id: current.eventId }, data: { availableCapacity: { increment: 1 } } });
    }
    const active = await transaction.waitlistEntry.findMany({
      where: { eventId: current.eventId, ticketTypeId: current.ticketTypeId, status: { in: activeStatuses } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    for (const [index, entry] of active.entries()) await transaction.waitlistEntry.update({ where: { id: entry.id }, data: { position: index + 1 } });
    return { kind: 'cancelled' as const, eventId: current.eventId, ticketTypeId: current.ticketTypeId, wasOffered: current.status === WaitlistStatus.OFFERED };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (result.kind === 'cancelled' && result.wasOffered) await offerNextWaitlist(result.eventId, result.ticketTypeId, 1);
  return result.kind;
};
