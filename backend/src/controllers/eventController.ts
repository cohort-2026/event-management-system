import { Request, Response, NextFunction } from 'express';
import {
  BookingStatus,
  EventStatus,
  EventType,
  PaymentStatus,
  Prisma,
  TicketStatus,
} from '@prisma/client';
import {
  sendEventCancellationNotification,
  sendEventChangeNotification,
} from '../services/emailService';
import { prisma } from '../lib/prisma';
const MAX_CAPACITY = 1_000_000;
const MAX_TICKETS = 20;
const MAX_PRICE = 99_999_999.99;
const ALLOWED_EVENT_TYPES: EventType[] = ['IN_PERSON', 'ONLINE', 'HYBRID'];
const ALLOWED_EVENT_CATEGORIES = ['Networking', 'Workshop', 'Training', 'Company Activities', 'other'];
const PUBLISHABLE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.DRAFT,
];

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
  vendorStandsAvailable: number;
  startTime: Date;
  endTime: Date;
  capacity: number;
  isFree: boolean;
  price: number | null;
  vendorStandRatePerSqm: number;
  ticketTypes: TicketInput[];
}

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const getEventId = (req: Request): string | null => {
  const id = req.params.id;
  return typeof id === 'string' && id.trim() ? id : null;
};

interface Pagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

const getPagination = (req: Request): Pagination | undefined => {
  if (req.query.page === undefined && req.query.limit === undefined) return undefined;
  const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

const paginationMeta = (pagination: Pagination, total: number) => ({
  page: pagination.page,
  limit: pagination.limit,
  total,
  totalPages: Math.ceil(total / pagination.limit),
});

const readQueryString = (req: Request, key: string): string | undefined | null => {
  const value = req.query[key];
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value.trim() : null;
};

const parseDateFilter = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
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
  const categorySelection = text(body.category);
  const categoryOther = text(body.categoryOther);
  const eventType = body.eventType;
  const venue = text(body.venue);
  const meetingDetails = text(body.meetingDetails);
  const rawBannerImageUrl = text(body.bannerImageUrl);
  const startTime = typeof body.startTime === 'string' ? new Date(body.startTime) : new Date(Number.NaN);
  const endTime = typeof body.endTime === 'string' ? new Date(body.endTime) : new Date(Number.NaN);
  const capacity = body.capacity;
  const vendorStandsAvailable = body.vendorStandsAvailable === undefined ? 0 : body.vendorStandsAvailable;
  const vendorStandRatePerSqm = body.vendorStandRatePerSqm === undefined ? 0 : body.vendorStandRatePerSqm;
  const ticketTypesInput = body.ticketTypes;

  if (title.length < 3 || title.length > 150) return { error: 'Event title must be between 3 and 150 characters' };
  if (description.length < 20 || description.length > 5000) return { error: 'Event description must be between 20 and 5000 characters' };
  if (!ALLOWED_EVENT_CATEGORIES.includes(categorySelection)) {
    return { error: 'Choose a category from the available options' };
  }
  if (categorySelection === 'other') {
    if (typeof body.categoryOther !== 'string' || categoryOther.length < 2 || categoryOther.length > 80) {
      return { error: 'Enter an other category between 2 and 80 characters' };
    }
  } else if (body.categoryOther !== undefined && categoryOther) {
    return { error: 'Custom category text is only allowed when other is selected' };
  }
  const category = categorySelection === 'other' ? categoryOther : categorySelection;
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
  if (typeof vendorStandsAvailable !== 'number' || !Number.isInteger(vendorStandsAvailable) ||
      vendorStandsAvailable < 0 || vendorStandsAvailable > MAX_CAPACITY) {
    return { error: `Available vendor stands must be a whole number between 0 and ${MAX_CAPACITY}` };
  }
  if (
    typeof vendorStandRatePerSqm !== 'number' ||
    !Number.isFinite(vendorStandRatePerSqm) ||
    vendorStandRatePerSqm < 0 ||
    vendorStandRatePerSqm > MAX_PRICE ||
    Math.abs(vendorStandRatePerSqm - Math.round(vendorStandRatePerSqm * 100) / 100) > 1e-8
  ) {
    return { error: 'Vendor stand rate must be between 0 and 99,999,999.99 ZAR per square metre' };
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
      vendorStandsAvailable,
      startTime,
      endTime,
      capacity,
      isFree,
      price,
      vendorStandRatePerSqm,
      ticketTypes,
    },
  };
};

const eventInclude = {
  ticketTypes: { orderBy: { price: 'asc' as const } },
  _count: {
    select: {
      vendorApplications: { where: { status: 'APPROVED' as const } },
    },
  },
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

const serializeEvent = (event: Prisma.EventGetPayload<{ include: typeof eventInclude }>) => {
  const { _count, ...eventData } = event;
  return {
    ...eventData,
    price: event.price === null ? null : Number(event.price),
    vendorStandRatePerSqm: Number(event.vendorStandRatePerSqm),
    availableVendorStands: Math.max(0, event.vendorStandsAvailable - _count.vendorApplications),
    ticketTypes: event.ticketTypes.map(ticket => ({ ...ticket, price: Number(ticket.price) })),
  };
};

const serializePublicEvent = (event: Prisma.EventGetPayload<{ include: typeof eventInclude }>) => {
  const {
    meetingDetails: _meetingDetails,
    organizerId: _organizerId,
    ...publicEvent
  } = serializeEvent(event);
  return publicEvent;
};

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
        vendorStandsAvailable: data.vendorStandsAvailable,
        capacity: data.capacity,
        availableCapacity: data.capacity,
        isFree: data.isFree,
        price: data.price,
        vendorStandRatePerSqm: data.vendorStandRatePerSqm,
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

type EventUpdateOutcome =
  | { error: 'not_found' | 'concurrent_change' | 'not_editable' | 'capacity_too_low' | 'ticket_type_has_history' }
  | {
    event: Prisma.EventGetPayload<{ include: typeof eventInclude }>;
    notifyAudience: boolean;
  };

class EventUpdateConflictError extends Error {}

const updateEventRecord = async (
  eventId: string,
  organizerId: string,
  data: EventInput,
  expectedUpdatedAt?: Date,
): Promise<EventUpdateOutcome> => {
  try {
    return await prisma.$transaction(async transaction => {
      const event = await transaction.event.findFirst({
        where: {
          id: eventId,
          organizerId,
          ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
        },
        include: {
          ticketTypes: { include: { _count: { select: { bookings: true } } } },
        },
      });
      if (!event) return { error: expectedUpdatedAt ? 'concurrent_change' : 'not_found' };
      if (event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED) {
        return { error: 'not_editable' };
      }

      const activeBookingCount = event.capacity - event.availableCapacity;
      if (data.capacity < activeBookingCount) return { error: 'capacity_too_low' };

      const previousTicketTypes = new Map(
        event.ticketTypes.map(ticket => [ticket.name.toLocaleLowerCase(), ticket]),
      );
      const requestedNames = new Set(data.ticketTypes.map(ticket => ticket.name.toLocaleLowerCase()));
      const removedTypes = event.ticketTypes.filter(ticket => !requestedNames.has(ticket.name.toLocaleLowerCase()));
      if (removedTypes.some(ticket => ticket._count.bookings > 0)) {
        return { error: 'ticket_type_has_history' };
      }

      for (const ticket of data.ticketTypes) {
        const previous = previousTicketTypes.get(ticket.name.toLocaleLowerCase());
        if (!previous) continue;

        const issuedQuantity = previous.quantity - previous.availableQuantity;
        if (ticket.quantity < issuedQuantity) return { error: 'capacity_too_low' };
        if (
          previous._count.bookings > 0 &&
          (
            previous.name !== ticket.name ||
            Number(previous.price) !== ticket.price ||
            ticket.quantity < previous.quantity
          )
        ) {
          return { error: 'ticket_type_has_history' };
        }
      }

      for (const ticket of removedTypes) {
        const deleted = await transaction.eventTicketType.deleteMany({
          where: { id: ticket.id, eventId, bookings: { none: {} } },
        });
        if (deleted.count !== 1) throw new EventUpdateConflictError();
      }

      await transaction.event.update({
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
          vendorStandsAvailable: data.vendorStandsAvailable,
          capacity: data.capacity,
          availableCapacity: data.capacity - activeBookingCount,
          isFree: data.isFree,
          price: data.price,
          vendorStandRatePerSqm: data.vendorStandRatePerSqm,
        },
      });

      for (const ticket of data.ticketTypes) {
        const previous = previousTicketTypes.get(ticket.name.toLocaleLowerCase());
        const issuedQuantity = previous ? previous.quantity - previous.availableQuantity : 0;
        const ticketData = {
          name: ticket.name,
          description: ticket.description ?? null,
          price: ticket.price,
          quantity: ticket.quantity,
          availableQuantity: ticket.quantity - issuedQuantity,
        };
        if (previous) {
          await transaction.eventTicketType.update({
            where: { id: previous.id },
            data: ticketData,
          });
        } else {
          await transaction.eventTicketType.create({
            data: { ...ticketData, eventId },
          });
        }
      }

      const updatedEvent = await transaction.event.findUniqueOrThrow({
        where: { id: event.id },
        include: eventInclude,
      });
      return { event: updatedEvent, notifyAudience: event.status === EventStatus.PUBLISHED };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (
      error instanceof EventUpdateConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
    ) {
      return { error: 'concurrent_change' };
    }
    throw error;
  }
};

const sendEventUpdateResponse = async (
  eventId: string,
  result: EventUpdateOutcome,
  res: Response,
): Promise<void> => {
  if ('error' in result) {
    const errors = {
      not_found: [404, 'Event not found'],
      concurrent_change: [409, 'Event or ticket availability changed; reload and try again'],
      not_editable: [409, 'This event can no longer be edited'],
      capacity_too_low: [409, 'Capacity or ticket quantity cannot be lower than existing registrations'],
      ticket_type_has_history: [409, 'Ticket types with booking history cannot be removed or have their name or price changed'],
    } as const;
    const [status, message] = errors[result.error];
    res.status(status).json({ success: false, message });
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
  res.json({
    success: true,
    data: serializeEvent(result.event),
    message: notificationSent
      ? 'Event changes saved.'
      : 'Event changes saved. Some attendee or vendor notifications could not be sent.',
    notificationSent,
  });
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

    await sendEventUpdateResponse(
      eventId,
      await updateEventRecord(eventId, req.user!.id, parsed.value),
      res,
    );
  } catch (err) {
    next(err);
  }
};

const PATCHABLE_EVENT_FIELDS = new Set([
  'title',
  'description',
  'category',
  'categoryOther',
  'venue',
  'eventType',
  'meetingDetails',
  'bannerImageUrl',
  'vendorStandsAvailable',
  'vendorStandRatePerSqm',
  'startTime',
  'endTime',
  'capacity',
  'ticketTypes',
]);

export const patchEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }

    const patch = req.body as Record<string, unknown>;
    const fields = Object.keys(patch);
    if (!fields.length || fields.some(field => !PATCHABLE_EVENT_FIELDS.has(field))) {
      res.status(400).json({
        success: false,
        message: 'The event update contains no editable fields or includes protected fields',
      });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: req.user!.id },
      include: { ticketTypes: true },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED) {
      res.status(409).json({ success: false, message: 'This event can no longer be edited' });
      return;
    }

    const isCustomCategory = !ALLOWED_EVENT_CATEGORIES.includes(event.category);
    const merged: Record<string, unknown> = {
      title: event.title,
      description: event.description,
      category: isCustomCategory ? 'other' : event.category,
      ...(isCustomCategory ? { categoryOther: event.category } : {}),
      venue: event.venue,
      eventType: event.eventType,
      meetingDetails: event.meetingDetails ?? '',
      bannerImageUrl: event.bannerImageUrl ?? '',
      vendorStandsAvailable: event.vendorStandsAvailable,
      vendorStandRatePerSqm: Number(event.vendorStandRatePerSqm),
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      capacity: event.capacity,
      ticketTypes: event.ticketTypes.map(ticket => ({
        name: ticket.name,
        description: ticket.description ?? '',
        price: Number(ticket.price),
        quantity: ticket.quantity,
      })),
      ...patch,
    };
    if (Object.prototype.hasOwnProperty.call(patch, 'category') && patch.category !== 'other') {
      delete merged.categoryOther;
    }

    const parsed = parseEventInput(merged);
    if (!parsed.value) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }

    await sendEventUpdateResponse(
      eventId,
      await updateEventRecord(eventId, req.user!.id, parsed.value, event.updatedAt),
      res,
    );
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const event = await transaction.event.findFirst({
        where: { id: eventId, organizerId: req.user!.id },
        select: {
          id: true,
          status: true,
          _count: { select: { bookings: true, tickets: true, vendorApplications: true } },
        },
      });
      if (!event) return 'not_found' as const;
      if (event.status !== EventStatus.DRAFT) return 'not_draft' as const;
      if (event._count.bookings > 0 || event._count.tickets > 0 || event._count.vendorApplications > 0) {
        return 'has_history' as const;
      }

      const deleted = await transaction.event.deleteMany({
        where: { id: event.id, organizerId: req.user!.id, status: EventStatus.DRAFT },
      });
      return deleted.count === 1 ? 'deleted' as const : 'changed' as const;
    });

    if (result === 'not_found') {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (result === 'not_draft') {
      res.status(409).json({ success: false, message: 'Only draft events can be deleted' });
      return;
    }
    if (result === 'has_history') {
      res.status(409).json({ success: false, message: 'Events with bookings, tickets, or vendor applications cannot be deleted' });
      return;
    }
    if (result === 'changed') {
      res.status(409).json({ success: false, message: 'Event status changed; reload and try again' });
      return;
    }

    res.json({ success: true, message: 'Draft event deleted.' });
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
    const outcome = await prisma.$transaction(async transaction => {
      const event = await transaction.event.findFirst({
        where: { id: eventId, organizerId: req.user!.id },
        include: { ticketTypes: true },
      });
      if (!event) return 'not_found' as const;
      if (!PUBLISHABLE_EVENT_STATUSES.includes(event.status)) return 'not_draft' as const;
      if (event.startTime <= new Date() || event.endTime <= event.startTime) return 'past' as const;

      const ticketQuantity = event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0);
      const hasValidTickets = event.ticketTypes.length > 0 &&
        event.ticketTypes.every(ticket =>
          ticket.name.trim().length >= 2 &&
          ticket.quantity > 0 &&
          ticket.availableQuantity >= 0 &&
          ticket.availableQuantity <= ticket.quantity &&
          Number(ticket.price) >= 0,
        ) &&
        ticketQuantity === event.capacity;
      const hasRequiredDetails = event.title.trim().length >= 3 &&
        event.description.trim().length >= 20 &&
        event.category.trim().length > 0 &&
        event.capacity > 0 &&
        (event.eventType === 'ONLINE' ||
          (event.venue.trim().length >= 2 && event.venue.trim().length <= 250)) &&
        (event.eventType === 'IN_PERSON' || Boolean(event.meetingDetails?.trim()));
      if (!hasValidTickets || !hasRequiredDetails) return 'incomplete' as const;

      const updated = await transaction.event.updateMany({
        where: {
          id: eventId,
          organizerId: req.user!.id,
          status: EventStatus.DRAFT,
          startTime: { gt: new Date() },
          endTime: { gt: new Date() },
        },
        data: { status: EventStatus.PUBLISHED },
      });
      return updated.count === 1 ? 'published' as const : 'changed' as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (outcome !== 'published') {
      if (outcome === 'not_found') {
        res.status(404).json({ success: false, message: 'Event not found' });
      } else if (outcome === 'not_draft') {
        res.status(409).json({ success: false, message: 'Only draft events can be published' });
      } else if (outcome === 'past') {
        res.status(400).json({ success: false, message: 'Past or invalid events cannot be published' });
      } else if (outcome === 'incomplete') {
        res.status(400).json({ success: false, message: 'Complete all required event details and ticket types before publishing' });
      } else {
        res.status(409).json({ success: false, message: 'Event status changed; reload and try again' });
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
    const pagination = getPagination(req);
    const where = { organizerId: req.user!.id };
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: eventInclude,
        orderBy: [{ updatedAt: 'desc' }],
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      pagination ? prisma.event.count({ where }) : Promise.resolve(0),
    ]);
    res.json({
      success: true,
      data: events.map(serializeEvent),
      ...(pagination ? { pagination: paginationMeta(pagination, total) } : {}),
    });
  } catch (err) {
    next(err);
  }
};

export const listPublicEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = readQueryString(req, 'search');
    const category = readQueryString(req, 'category');
    const location = readQueryString(req, 'location');
    const startDateValue = readQueryString(req, 'startDate');
    const endDateValue = readQueryString(req, 'endDate');

    if (
      search === null || (search !== undefined && search.length > 200) ||
      category === null || (category !== undefined && category.length > 80) ||
      location === null || (location !== undefined && location.length > 250) ||
      startDateValue === null || endDateValue === null
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid event filters',
        errors: [{ field: 'query', message: 'Filters must be single values within the supported lengths' }],
      });
      return;
    }

    const startDate = startDateValue ? parseDateFilter(startDateValue) : undefined;
    const endDate = endDateValue ? parseDateFilter(endDateValue) : undefined;
    if ((startDateValue && !startDate) || (endDateValue && !endDate)) {
      res.status(400).json({
        success: false,
        message: 'Invalid event date filter',
        errors: [{ field: 'startDate/endDate', message: 'Dates must use YYYY-MM-DD format' }],
      });
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      res.status(400).json({
        success: false,
        message: 'Invalid event date range',
        errors: [{ field: 'startDate/endDate', message: 'startDate must not be after endDate' }],
      });
      return;
    }

    const where: Prisma.EventWhereInput = { status: EventStatus.PUBLISHED };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (location) where.venue = { contains: location, mode: 'insensitive' };
    if (startDate || endDate) {
      const endExclusive = endDate ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000) : undefined;
      where.startTime = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endExclusive ? { lt: endExclusive } : {}),
      };
    }

    const pagination = getPagination(req);
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: eventInclude,
        orderBy: { startTime: 'asc' },
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      pagination ? prisma.event.count({ where }) : Promise.resolve(0),
    ]);
    res.json({
      success: true,
      data: events.map(serializePublicEvent),
      ...(pagination ? { pagination: paginationMeta(pagination, total) } : {}),
    });
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
    res.json({ success: true, data: serializePublicEvent(event) });
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

    const pagination = getPagination(req) ?? { page: 1, limit: 20, skip: 0, take: 20 };
    const where = { eventId };
    const [applications, total] = await Promise.all([
      prisma.vendorApplication.findMany({
        where,
        include: {
          staffMembers: true,
          invoice: true,
          vendor: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              vendorProfile: {
                select: {
                  businessName: true,
                  businessType: true,
                  businessAddress: true,
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
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.vendorApplication.count({ where }),
    ]);

    res.json({ success: true, data: applications, pagination: paginationMeta(pagination, total) });
  } catch (err) {
    next(err);
  }
};

export const getAdminEventAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [statusCounts, publishedByCategory] = await Promise.all([
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
        publishedByCategory: publishedByCategory.map(({ category, _count }) => ({
          category,
          count: _count._all,
        })),
      },
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

export const completeEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = getEventId(req);
    if (!eventId) {
      res.status(400).json({ success: false, message: 'A valid event ID is required' });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: req.user!.id },
      select: { id: true, status: true, endTime: true },
    });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }
    if (event.status !== EventStatus.PUBLISHED) {
      res.status(409).json({ success: false, message: 'Only published events can be completed' });
      return;
    }
    if (event.endTime > new Date()) {
      res.status(409).json({ success: false, message: 'An event can only be completed after its end time' });
      return;
    }

    const updated = await prisma.event.updateMany({
      where: { id: eventId, organizerId: req.user!.id, status: EventStatus.PUBLISHED, endTime: { lte: new Date() } },
      data: { status: EventStatus.COMPLETED },
    });
    if (updated.count !== 1) {
      res.status(409).json({ success: false, message: 'Event status changed; reload and try again' });
      return;
    }

    const completedEvent = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: eventInclude });
    res.json({ success: true, data: serializeEvent(completedEvent), message: 'Event marked as completed.' });
  } catch (err) {
    next(err);
  }
};

export const listEventBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const pagination = getPagination(req);
    const where = { eventId };
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          attendee: { select: { id: true, firstname: true, lastname: true, email: true } },
          tickets: { select: { referenceNumber: true, type: true, status: true, issuedAt: true } },
          payment: { select: { amount: true, currency: true, status: true, provider: true, createdAt: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      pagination ? prisma.booking.count({ where }) : Promise.resolve(0),
    ]);
    res.json({
      success: true,
      data: bookings.map(booking => ({ ...booking, ticket: booking.tickets[0] ?? null })),
      ...(pagination ? { pagination: paginationMeta(pagination, total) } : {}),
    });
  } catch (err) {
    next(err);
  }
};

export const getEventAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const pagination = getPagination(req) ?? { page: 1, limit: 20, skip: 0, take: 20 };
    const where: Prisma.TicketWhereInput = {
      eventId,
      OR: [
        { status: TicketStatus.ACTIVE, checkedInAt: null },
        { status: TicketStatus.USED, checkedInAt: { not: null } },
      ],
      event: { is: { status: { not: EventStatus.CANCELLED } } },
      booking: {
        is: {
          eventId,
          status: BookingStatus.CONFIRMED,
          OR: [
            { paymentStatus: PaymentStatus.NOT_REQUIRED },
            {
              paymentStatus: PaymentStatus.PAID,
              payment: { is: { status: PaymentStatus.PAID } },
            },
          ],
        },
      },
    };
    const checkedInWhere: Prisma.TicketWhereInput = { ...where, status: TicketStatus.USED };
    const [totalConfirmedTickets, totalCheckedInTickets, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: checkedInWhere }),
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          referenceNumber: true,
          type: true,
          status: true,
          issuedAt: true,
          checkedInAt: true,
          holder: { select: { firstname: true, lastname: true } },
          booking: {
            select: {
              reference: true,
              eventTicketType: { select: { name: true } },
            },
          },
        },
        orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);
    const totalNotYetCheckedInTickets = totalConfirmedTickets - totalCheckedInTickets;

    res.json({
      success: true,
      data: {
        totalConfirmedTickets,
        totalCheckedInTickets,
        totalNotYetCheckedInTickets,
        attendancePercentage: totalConfirmedTickets === 0
          ? 0
          : Number(((totalCheckedInTickets / totalConfirmedTickets) * 100).toFixed(2)),
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          referenceNumber: ticket.referenceNumber,
          type: ticket.type,
          ticketType: ticket.booking.eventTicketType?.name ?? ticket.type,
          status: ticket.status,
          issuedAt: ticket.issuedAt,
          checkedInAt: ticket.checkedInAt,
          attendee: ticket.holder,
          bookingReference: ticket.booking.reference,
        })),
      },
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalConfirmedTickets,
        totalPages: Math.ceil(totalConfirmedTickets / pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
