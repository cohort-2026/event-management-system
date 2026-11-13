import { TicketStatus } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import {
  checkInTicketForOrganizer,
  isValidQrPayload,
} from '../services/ticketCheckInService';
import type { TicketCheckInResult } from '../services/ticketCheckInService';

const getPagination = (req: Request) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  return { page, limit, skip: (page - 1) * limit };
};

const checkInResponse = (result: TicketCheckInResult, res: Response): void => {
  if (result.kind === 'not_found') {
    res.status(404).json({ success: false, message: 'Ticket not found for an event you organize' });
    return;
  }
  if (result.kind === 'already_used') {
    res.status(409).json({ success: false, message: 'This ticket has already been checked in' });
    return;
  }
  if (result.kind === 'invalid_ticket') {
    res.status(409).json({ success: false, message: 'This ticket is cancelled or invalid' });
    return;
  }
  if (result.kind === 'invalid_booking') {
    res.status(409).json({
      success: false,
      message: 'The ticket booking is not confirmed or its payment is not successful',
    });
    return;
  }
  if (result.kind === 'event_not_in_progress') {
    res.status(409).json({ success: false, message: 'Tickets can only be checked in while the event is in progress' });
    return;
  }
  res.json({
    success: true,
    message: 'Ticket checked in.',
    data: result.ticket,
  });
};

export const listMyTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pagination = getPagination(req);
    const where = { holderId: req.user!.id };
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          referenceNumber: true,
          qrPayload: true,
          bookingId: true,
          holderId: true,
          type: true,
          status: true,
          eventId: true,
          issuedAt: true,
          checkedInAt: true,
          event: {
            select: { id: true, title: true, date: true, startTime: true, endTime: true, venue: true },
          },
          booking: {
            select: {
              reference: true,
              status: true,
              paymentStatus: true,
              eventTicketType: { select: { name: true } },
            },
          },
        },
        orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      success: true,
      data: tickets.map(ticket => ({
        ...ticket,
        ticketType: ticket.booking.eventTicketType?.name ?? ticket.type,
        bookingReference: ticket.booking.reference,
        checkedIn: ticket.status === TicketStatus.USED,
        checkInStatus: ticket.status === TicketStatus.USED
          ? 'CHECKED_IN'
          : ticket.status === TicketStatus.CANCELLED
            ? 'CANCELLED'
            : 'NOT_CHECKED_IN',
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
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
      select: {
        id: true,
        referenceNumber: true,
        qrPayload: true,
        bookingId: true,
        holderId: true,
        type: true,
        status: true,
        eventId: true,
        issuedAt: true,
        checkedInAt: true,
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            venue: true,
            organizerId: true,
          },
        },
        booking: {
          select: {
            reference: true,
            status: true,
            paymentStatus: true,
            eventTicketType: { select: { name: true } },
          },
        },
      },
    });
    const isAttendeeOwner = req.user!.role === 'ATTENDEE' && ticket?.holderId === req.user!.id;
    const isOrganizerOwner = req.user!.role === 'ORGANIZER' &&
      ticket?.event.organizerId === req.user!.id;
    if (!ticket || (!isAttendeeOwner && !isOrganizerOwner)) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: ticket.id,
        referenceNumber: ticket.referenceNumber,
        ...(isAttendeeOwner ? { qrPayload: ticket.qrPayload, holderId: ticket.holderId } : {}),
        bookingId: ticket.bookingId,
        bookingReference: ticket.booking.reference,
        bookingStatus: ticket.booking.status,
        paymentStatus: ticket.booking.paymentStatus,
        type: ticket.type,
        ticketType: ticket.booking.eventTicketType?.name ?? ticket.type,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        checkedInAt: ticket.checkedInAt,
        checkedIn: ticket.status === TicketStatus.USED,
        eventId: ticket.eventId,
        event: {
          id: ticket.event.id,
          title: ticket.event.title,
          date: ticket.event.date,
          startTime: ticket.event.startTime,
          endTime: ticket.event.endTime,
          venue: ticket.event.venue,
        },
      },
    });
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
    checkInResponse(
      await checkInTicketForOrganizer({ ticketId: id }, req.user!.id),
      res,
    );
  } catch (error) {
    next(error);
  }
};

export const scanTicketQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const keys = Object.keys(body);
  if (
    keys.length !== 1 ||
    keys[0] !== 'qrPayload' ||
    typeof body.qrPayload !== 'string' ||
    !isValidQrPayload(body.qrPayload)
  ) {
    res.status(400).json({
      success: false,
      message: 'Provide only a valid QR payload',
      errors: [{ field: 'qrPayload', message: 'Must contain 1 to 128 alphanumeric, underscore, or hyphen characters' }],
    });
    return;
  }

  try {
    checkInResponse(
      await checkInTicketForOrganizer({ qrPayload: body.qrPayload }, req.user!.id),
      res,
    );
  } catch (error) {
    next(error);
  }
};
