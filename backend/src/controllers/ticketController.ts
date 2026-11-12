import { EventStatus, PrismaClient, TicketStatus } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

export const listMyTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { holderId: req.user!.id },
      include: { event: { select: { id: true, title: true, startTime: true, endTime: true, venue: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid ticket ID is required' });
      return;
    }
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true, startTime: true, endTime: true, venue: true, organizerId: true } },
      },
    });
    if (!ticket || (ticket.holderId !== req.user!.id &&
      ticket.event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const checkInTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid ticket ID is required' });
      return;
    }
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        status: true,
        event: { select: { organizerId: true, startTime: true, endTime: true, status: true } },
      },
    });
    if (!ticket || ticket.event.organizerId !== req.user!.id) {
      res.status(404).json({ success: false, message: 'Ticket not found for an event you organize' });
      return;
    }
    const now = new Date();
    if (ticket.status !== TicketStatus.ACTIVE) {
      res.status(409).json({ success: false, message: 'This ticket is not active or has already been checked in' });
      return;
    }
    if (ticket.event.status !== EventStatus.PUBLISHED ||
      ticket.event.startTime > now || ticket.event.endTime < now) {
      res.status(409).json({ success: false, message: 'Tickets can only be checked in while the event is in progress' });
      return;
    }

    const updated = await prisma.ticket.updateMany({
      where: { id, eventId: ticket.eventId, status: TicketStatus.ACTIVE },
      data: { status: TicketStatus.USED },
    });
    if (updated.count !== 1) {
      res.status(409).json({ success: false, message: 'This ticket has already been checked in' });
      return;
    }
    res.json({ success: true, message: 'Ticket checked in.' });
  } catch (error) {
    next(error);
  }
};
