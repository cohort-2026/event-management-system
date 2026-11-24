import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { isUuid } from '../middleware/requestValidation';
import { cancelWaitlistEntry, getPosition, joinWaitlist } from '../services/waitlistService';

export const createWaitlistEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId.trim() : '';
  const ticketTypeId = typeof req.body?.ticketTypeId === 'string' ? req.body.ticketTypeId.trim() : '';
  if (!isUuid(eventId) || !isUuid(ticketTypeId)) {
    res.status(400).json({ success: false, message: 'Valid eventId and ticketTypeId UUIDs are required' });
    return;
  }
  try {
    const result = await joinWaitlist(eventId, ticketTypeId, req.user!.id);
    if (result.kind === 'event_missing') { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    if (result.kind === 'ticket_missing' || result.kind === 'ticket_mismatch') { res.status(404).json({ success: false, message: 'Ticket type not found for this event' }); return; }
    if (result.kind === 'event_unavailable') { res.status(409).json({ success: false, message: 'Waitlists are only available for published upcoming events' }); return; }
    if (result.kind === 'not_sold_out') { res.status(409).json({ success: false, message: 'This ticket type is not sold out' }); return; }
    if (result.kind === 'duplicate') { res.status(409).json({ success: false, message: 'You are already on this waitlist' }); return; }
    res.status(201).json({ success: true, data: result.entry, message: 'You have joined the waitlist' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002')) {
      res.status(409).json({ success: false, message: 'The waitlist changed; retry your request' });
      return;
    }
    next(error);
  }
};

export const listMyWaitlists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const entries = await prisma.waitlistEntry.findMany({
      where: { attendeeId: req.user!.id },
      include: {
        event: { select: { id: true, title: true, date: true, startTime: true, endTime: true, venue: true, bannerImageUrl: true } },
        ticketType: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    const queueKeys = [...new Map(entries.filter(entry => entry.status === 'WAITING' || entry.status === 'OFFERED')
      .map(entry => [`${entry.eventId}:${entry.ticketTypeId}`, { eventId: entry.eventId, ticketTypeId: entry.ticketTypeId }])).values()];
    const queueRows = queueKeys.length ? await prisma.waitlistEntry.findMany({
      where: { status: { in: ['WAITING', 'OFFERED'] }, OR: queueKeys },
      select: { id: true, eventId: true, ticketTypeId: true, position: true, createdAt: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    }) : [];
    const activeQueues = new Map<string, string[]>();
    for (const row of queueRows) {
      const key = `${row.eventId}:${row.ticketTypeId}`;
      activeQueues.set(key, [...(activeQueues.get(key) ?? []), row.id]);
    }
    res.json({ success: true, data: entries.map(entry => {
      const queue = activeQueues.get(`${entry.eventId}:${entry.ticketTypeId}`) ?? [];
      return { ...entry, position: queue.indexOf(entry.id) >= 0 ? queue.indexOf(entry.id) + 1 : entry.position };
    }) });
  } catch (error) { next(error); }
};

export const getWaitlistEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const result = await getPosition(id, req.user!.id, req.user!.role === 'ADMIN');
    if (result.kind === 'missing') { res.status(404).json({ success: false, message: 'Waitlist entry not found' }); return; }
    if (result.kind === 'forbidden') { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
    res.json({ success: true, data: { ...result.entry, position: result.position } });
  } catch (error) { next(error); }
};

export const leaveWaitlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const result = await cancelWaitlistEntry(id, req.user!.id, req.user!.role === 'ADMIN');
    if (result === 'missing') { res.status(404).json({ success: false, message: 'Waitlist entry not found' }); return; }
    if (result === 'forbidden') { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
    if (result === 'claimed') { res.status(409).json({ success: false, message: 'A claimed waitlist entry cannot be cancelled' }); return; }
    if (result === 'inactive') { res.status(409).json({ success: false, message: 'Waitlist entry is no longer active' }); return; }
    res.json({ success: true, message: 'You have left the waitlist' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json({ success: false, message: 'The waitlist changed; retry your request' });
      return;
    }
    next(error);
  }
};
