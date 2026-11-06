import { Request, Response, NextFunction } from 'express';
import { EventStatus, EventType, Prisma, PrismaClient } from '@prisma/client';
import {
  sendEventCancellationNotification,
  sendEventChangeNotification,
  sendEventStatusNotification,
} from '@/services/emailService';

const prisma = new PrismaClient();
const MAX_CAPACITY = 1_000_000;
const MAX_TICKETS = 20;
const MAX_PRICE = 99_999_999.99;
const ALLOWED_EVENT_TYPES: EventType[] = ['IN_PERSON', 'ONLINE', 'HYBRID'];

interface TicketInput {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

interface EventInput {
  title: string;
  description: string;
  category: string;
  venue: string;
  eventType: EventType;
  meetingDetails: string | null;
  bannerImageUrl: string | null;
  startTime: Date;
  endTime: Date;
  capacity: number;
  isFree: boolean;
  price: number | null;
  ticketTypes: TicketInput[];
}

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const getEventId = (req: Request): string | null => {
  const id = req.params.id;
  return typeof id === 'string' && id.trim() ? id : null;
};

const validWebUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const parseEventInput = (body: Record<string, unknown>):
  { value: EventInput; error?: never } | { value?: never; error: string } => {
  const title = text(body.title);
  const description = text(body.description);
  const category = text(body.category);
  const eventType = body.eventType;
  const venue = text(body.venue);
  const meetingDetails = text(body.meetingDetails);
  const rawBannerImageUrl = text(body.bannerImageUrl);
  const startTime = typeof body.startTime === 'string' ? new Date(body.startTime) : new Date(Number.NaN);
  const endTime = typeof body.endTime === 'string' ? new Date(body.endTime) : new Date(Number.NaN);
  const capacity = body.capacity;
  const ticketTypesInput = body.ticketTypes;

  if (title.length < 3 || title.length > 150) return { error: 'Event title must be between 3 and 150 characters' };
  if (description.length < 20 || description.length > 5000) return { error: 'Event description must be between 20 and 5000 characters' };
  if (category.length < 2 || category.length > 80) return { error: 'Event category must be between 2 and 80 characters' };
  if (typeof eventType !== 'string' || !ALLOWED_EVENT_TYPES.includes(eventType as EventType)) {
    return { error: 'Choose a valid event type' };
  }
  const normalizedEventType = eventType as EventType;
  if (!Number.isFinite(startTime.getTime()) || startTime <= new Date()) {
    return { error: 'Event start date and time must be in the future' };
  }
  if (!Number.isFinite(endTime.getTime()) || endTime <= startTime) {
    return { error: 'Event end date and time must be after the start date and time' };
  }
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
    return { error: `Event capacity must be a whole number between 1 and ${MAX_CAPACITY}` };
  }
  if (!Array.isArray(ticketTypesInput) || ticketTypesInput.length < 1 || ticketTypesInput.length > MAX_TICKETS) {
    return { error: `Add between 1 and ${MAX_TICKETS} ticket types` };
  }

  if (normalizedEventType !== 'ONLINE' && (venue.length < 2 || venue.length > 250)) {
    return { error: 'Venue must be between 2 and 250 characters for in-person or hybrid events' };
  }
  if (normalizedEventType === 'ONLINE' && !meetingDetails) {
    return { error: 'Add online meeting details for an online event' };
  }
  if (normalizedEventType === 'HYBRID' && !meetingDetails) {
    return { error: 'Add online meeting details for a hybrid event' };
  }
  if (meetingDetails.length > 2000) return { error: 'Meeting details cannot exceed 2000 characters' };
  if (normalizedEventType !== 'IN_PERSON' && meetingDetails.length > 0 &&
      (/^https?:\/\//i.test(meetingDetails) && !validWebUrl(meetingDetails))) {
    return { error: 'Meeting link must be a valid HTTP or HTTPS URL' };
  }

  let bannerImageUrl: string | null = null;
  if (rawBannerImageUrl) {
    if (rawBannerImageUrl.length > 2048 || !validWebUrl(rawBannerImageUrl)) {
      return { error: 'Banner image must be a valid HTTP or HTTPS URL under 2048 characters' };
    }
    bannerImageUrl = rawBannerImageUrl;
  }

  const ticketTypes: TicketInput[] = [];
  const ticketNames = new Set<string>();
  for (const rawTicket of ticketTypesInput) {
    if (typeof rawTicket !== 'object' || rawTicket === null || Array.isArray(rawTicket)) {
      return { error: 'Each ticket type must include a name, price, and quantity' };
    }
    const ticket = rawTicket as Record<string, unknown>;
    const name = text(ticket.name);
    const ticketDescription = text(ticket.description);
    if (name.length < 2 || name.length > 80) return { error: 'Ticket type names must be between 2 and 80 characters' };
    if (ticketDescription.length > 500) return { error: 'Ticket descriptions cannot exceed 500 characters' };
    if (ticketNames.has(name.toLocaleLowerCase())) return { error: 'Ticket type names must be unique' };
    ticketNames.add(name.toLocaleLowerCase());
    if (
      typeof ticket.price !== 'number' ||
      !Number.isFinite(ticket.price) ||
      ticket.price < 0 ||
      ticket.price > MAX_PRICE ||
      Math.abs(ticket.price - Math.round(ticket.price * 100) / 100) > 1e-8
    ) {
      return { error: 'Ticket prices must be between 0 and 99,999,999.99 with at most two decimal places' };
    }
    if (typeof ticket.quantity !== 'number' || !Number.isInteger(ticket.quantity) || ticket.quantity < 1 || ticket.quantity > MAX_CAPACITY) {
      return { error: 'Ticket quantities must be positive whole numbers' };
    }
    ticketTypes.push({
      name,
      ...(ticketDescription ? { description: ticketDescription } : {}),
      price: ticket.price,
      quantity: ticket.quantity,
    });
  }

  if (ticketTypes.reduce((total, ticket) => total + ticket.quantity, 0) !== capacity) {
    return { error: 'The total quantity of all ticket types must equal the event capacity' };
  }

  const isFree = ticketTypes.every(ticket => ticket.price === 0);
  const price = isFree ? null : Math.min(...ticketTypes.filter(ticket => ticket.price > 0).map(ticket => ticket.price));
  const normalizedVenue = normalizedEventType === 'ONLINE' ? (venue || 'Online') : venue;

  return {
    value: {
      title,
      description,
      category,
      venue: normalizedVenue,
      eventType: normalizedEventType,
      meetingDetails: meetingDetails || null,
      bannerImageUrl,
      startTime,
      endTime,
      capacity,
      isFree,
      price,
      ticketTypes,
    },
  };
};

const eventInclude = {
  ticketTypes: { orderBy: { price: 'asc' as const } },
};

const notifyEventAudience = async (
  eventId: string,
  kind: 'changed' | 'cancelled',
): Promise<boolean> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      bookings: {
        where: { status: { in: ['CONFIRMED', 'PENDING'] } },
        select: { attendee: { select: { email: true } } },
      },
      vendorApplications: {
        where: { status: 'APPROVED' },
        select: { vendor: { select: { email: true } } },
      },
    },
  });
  if (!event) return false;

  const emails = new Set([
    ...event.bookings.map(booking => booking.attendee.email),
    ...event.vendorApplications.map(application => application.vendor.email),
  ]);
  const sendNotification = kind === 'changed'
    ? sendEventChangeNotification
    : sendEventCancellationNotification;
  const results = await Promise.allSettled(
    [...emails].map(email => sendNotification(email, event.title)),
  );
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  for (const failure of failures) {
    console.error(`Event ${kind} notification failed:`, failure.reason);
  }
  return failures.length === 0;
};

const serializeEvent = <T extends { price: Prisma.Decimal | null; ticketTypes?: Array<{ price: Prisma.Decimal }> }>(event: T) => ({
  ...event,
  price: event.price === null ? null : Number(event.price),
  ...(event.ticketTypes ? {
    ticketTypes: event.ticketTypes.map(ticket => ({ ...ticket, price: Number(ticket.price) })),
  } : {}),
});

export const createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = parseEventInput(req.body ?? {});
    if (!parsed.value) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }

    const data = parsed.value;
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        venue: data.venue,
        date: data.startTime,
        startTime: data.startTime,
        endTime: data.endTime,
        eventType: data.eventType,
        meetingDetails: data.meetingDetails,
        bannerImageUrl: data.bannerImageUrl,
        capacity: data.capacity,
        availableCapacity: data.capacity,
        isFree: data.isFree,
        price: data.price,
        status: EventStatus.DRAFT,
        organizerId: req.user!.id,
        ticketTypes: {
          create: data.ticketTypes.map(ticket => ({
            ...ticket,
            availableQuantity: ticket.quantity,
          })),
        },
      },
      include: eventInclude,
    });

    res.status(201).json({ success: true, data: serializeEvent(event), message: 'Event saved as a draft.' });
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }
    const parsed = parseEventInput(req.body ?? {});
    if (!parsed.value) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }

    const data = parsed.value;
    const result = await prisma.$transaction(async transaction => {
      const event = await transaction.event.findFirst({
        where: { id: eventId, organizerId: req.user!.id },
        include: { ticketTypes: true },
      });
      if (!event) return { error: 'not_found' as const };
      if (event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED) {
        return { error: 'not_editable' as const };
      }

      const activeBookingCount = event.capacity - event.availableCapacity;
      if (data.capacity < activeBookingCount) {
        return { error: 'capacity_too_low' as const };
      }
      const previousTicketPrices = event.ticketTypes
        .map(ticket => `${ticket.name.toLocaleLowerCase()}:${Number(ticket.price)}`)
        .sort();
      const nextTicketPrices = data.ticketTypes
        .map(ticket => `${ticket.name.toLocaleLowerCase()}:${ticket.price}`)
        .sort();
      const priceChanged = Number(event.price ?? 0) !== Number(data.price ?? 0) ||
        previousTicketPrices.length !== nextTicketPrices.length ||
        previousTicketPrices.some((price, index) => price !== nextTicketPrices[index]);
      const requiresApproval = event.status === EventStatus.PUBLISHED && (
        event.startTime.getTime() !== data.startTime.getTime() ||
        event.endTime.getTime() !== data.endTime.getTime() ||
        event.venue !== data.venue ||
        event.capacity !== data.capacity ||
        priceChanged
      );
      const nextStatus = requiresApproval
        ? EventStatus.PENDING_APPROVAL
        : event.status === EventStatus.REJECTED
          ? EventStatus.DRAFT
          : event.status;
      const previousTicketTypes = new Map(event.ticketTypes.map(ticket => [ticket.name.toLocaleLowerCase(), ticket]));
      const updated = await transaction.event.update({
        where: { id: event.id },
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          venue: data.venue,
          date: data.startTime,
          startTime: data.startTime,
          endTime: data.endTime,
          eventType: data.eventType,
          meetingDetails: data.meetingDetails,
          bannerImageUrl: data.bannerImageUrl,
          capacity: data.capacity,
          availableCapacity: data.capacity - activeBookingCount,
          isFree: data.isFree,
          price: data.price,
          status: nextStatus,
          ...(requiresApproval ? { rejectionReason: null } : {}),
        },
        include: eventInclude,
      });
      await transaction.eventTicketType.deleteMany({ where: { eventId: event.id } });
      await transaction.eventTicketType.createMany({
        data: data.ticketTypes.map(ticket => ({
          ...ticket,
          availableQuantity: Math.min(
            ticket.quantity,
            previousTicketTypes.get(ticket.name.toLocaleLowerCase())?.availableQuantity ?? ticket.quantity,
          ),
          eventId: event.id,
        })),
      });
      const refreshed = await transaction.event.findUniqueOrThrow({
        where: { id: updated.id },
        include: eventInclude,
      });
      return { event: refreshed, notifyAudience: event.status === EventStatus.PUBLISHED };
    });

    if (result.error === 'not_found') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (result.error === 'not_editable') {
      res.status(409).json({ success: false, message: 'This event can no longer be edited' });
      return;
    }
    if (result.error === 'capacity_too_low') {
      res.status(409).json({ success: false, message: 'Capacity cannot be lower than the number of active registrations' });
      return;
    }

    let notificationSent = true;
    if (result.notifyAudience) {
      try {
        notificationSent = await notifyEventAudience(eventId, 'changed');
      } catch (error) {
        console.error('Event change notification failed:', error);
        notificationSent = false;
      }
    }
    const message = result.event.status === EventStatus.PENDING_APPROVAL && result.notifyAudience
      ? 'Critical event changes were saved. Publish the event when ready.'
      : 'Event changes saved.';
    res.json({
      success: true,
      data: serializeEvent(result.event),
      message: notificationSent
        ? message
        : `${message} Some attendee or vendor notifications could not be sent.`,
      notificationSent,
    });
  } catch (err) {
    next(err);
  }
};

export const publishEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }
    const result = await prisma.event.updateMany({
      where: {
        id: eventId,
        organizerId: req.user!.id,
        status: { in: [EventStatus.DRAFT, EventStatus.REJECTED, EventStatus.PENDING_APPROVAL] },
        startTime: { gt: new Date() },
        endTime: { gt: new Date() },
      },
      data: { status: EventStatus.PUBLISHED, rejectionReason: null },
    });
    if (result.count !== 1) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: req.user!.id },
        select: { status: true },
      });
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found' });
      } else if (![EventStatus.DRAFT, EventStatus.REJECTED, EventStatus.PENDING_APPROVAL].includes(event.status)) {
        res.status(409).json({ success: false, message: 'Only draft or pending events can be published' });
      } else {
        res.status(400).json({ success: false, message: 'Past events cannot be published' });
      }
      return;
    }

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: eventInclude });
    res.json({ success: true, data: serializeEvent(event), message: 'Event published and is now available to attendees.' });
  } catch (err) {
    next(err);
  }
};

export const listMyEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { organizerId: req.user!.id },
      include: eventInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
    res.json({ success: true, data: events.map(serializeEvent) });
  } catch (err) {
    next(err);
  }
};

export const listPublicEvents = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      include: eventInclude,
      orderBy: { startTime: 'asc' },
    });
    res.json({ success: true, data: events.map(serializeEvent) });
  } catch (err) {
    next(err);
  }
};

export const getPublicEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }
    const event = await prisma.event.findFirst({
      where: { id: eventId, status: EventStatus.PUBLISHED },
      include: eventInclude,
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    res.json({ success: true, data: serializeEvent(event) });
  } catch (err) {
    next(err);
  }
};

export const getManagedEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: req.user!.id },
      include: eventInclude,
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    res.json({ success: true, data: serializeEvent(event) });
  } catch (err) {
    next(err);
  }
};

export const listVendorApplicationsForEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: req.user!.id },
      select: { id: true },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const applications = await prisma.vendorApplication.findMany({
      where: { eventId },
      include: {
        vendor: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            vendorProfile: {
              select: {
                businessName: true,
                businessDescription: true,
                businessRegistrationNumber: true,
                contactPerson: true,
                contactEmail: true,
                contactPhone: true,
                productsServices: true,
                supportingDocumentUrls: true,
                logoUrl: true,
              },
            },
          },
        },
        decidedBy: { select: { firstname: true, lastname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
};

export const listEventsForApproval = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PENDING_APPROVAL },
      include: {
        ...eventInclude,
        organizer: { select: { firstname: true, lastname: true, email: true } },
      },
      orderBy: { updatedAt: 'asc' },
    });
    res.json({ success: true, data: events.map(serializeEvent) });
  } catch (err) {
    next(err);
  }
};

export const getAdminEventAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [statusCounts, approvedByCategory] = await Promise.all([
      prisma.event.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ['category'],
        where: { status: EventStatus.PUBLISHED },
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        statusCounts: statusCounts.map(({ status, _count }) => ({ status, count: _count._all })),
        approvedByCategory: approvedByCategory.map(({ category, _count }) => ({
          category,
          count: _count._all,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const notifyOrganizer = async (
  eventId: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string,
): Promise<boolean> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      organizer: { select: { firstname: true, email: true } },
    },
  });
  if (!event) return false;
  await sendEventStatusNotification(event.organizer.email, event.organizer.firstname, event.title, status, reason);
  return true;
};

export const approveEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }
    const updated = await prisma.event.updateMany({
      where: { id: eventId, status: EventStatus.PENDING_APPROVAL },
      data: { status: EventStatus.PUBLISHED, rejectionReason: null },
    });
    if (!updated.count) {
      res.status(404).json({ success: false, message: 'Pending event not found' });
      return;
    }

    let notificationSent = true;
    try {
      notificationSent = await notifyOrganizer(eventId, 'APPROVED');
    } catch (error) {
      console.error('Event approval notification failed:', error);
      notificationSent = false;
    }
    res.json({
      success: true,
      message: notificationSent
        ? 'Event approved and published. The organizer has been notified.'
        : 'Event approved and published, but the organizer notification could not be sent.',
      notificationSent,
    });
  } catch (err) {
    next(err);
  }
};

export const rejectEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }
    const reason = text(req.body?.reason);
    if (reason.length < 10 || reason.length > 2000) {
      res.status(400).json({ success: false, message: 'Provide a rejection reason between 10 and 2000 characters' });
      return;
    }

    const updated = await prisma.event.updateMany({
      where: { id: eventId, status: EventStatus.PENDING_APPROVAL },
      data: { status: EventStatus.DRAFT, rejectionReason: reason },
    });
    if (!updated.count) {
      res.status(404).json({ success: false, message: 'Pending event not found' });
      return;
    }

    let notificationSent = true;
    try {
      notificationSent = await notifyOrganizer(eventId, 'REJECTED', reason);
    } catch (error) {
      console.error('Event rejection notification failed:', error);
      notificationSent = false;
    }
    res.json({
      success: true,
      message: notificationSent
        ? 'Event rejected. The organizer has been notified.'
        : 'Event rejected, but the organizer notification could not be sent.',
      notificationSent,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }

    const updated = await prisma.event.updateMany({
      where: {
        id: eventId,
        organizerId: req.user!.id,
        status: EventStatus.PUBLISHED,
      },
      data: { status: EventStatus.CANCELLED },
    });
    if (updated.count !== 1) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, organizerId: req.user!.id },
        select: { status: true },
      });
      if (!event) {
        res.status(404).json({ success: false, message: 'Event not found' });
      } else {
        res.status(409).json({ success: false, message: 'Only published events can be cancelled' });
      }
      return;
    }

    let notificationSent = true;
    try {
      notificationSent = await notifyEventAudience(eventId, 'cancelled');
    } catch (error) {
      console.error('Event cancellation notification failed:', error);
      notificationSent = false;
    }
    res.json({
      success: true,
      message: notificationSent
        ? 'Event cancelled. Registered attendees and approved vendors have been notified.'
        : 'Event cancelled, but some attendee or vendor notifications could not be sent.',
      notificationSent,
    });
  } catch (err) {
    next(err);
  }
};
