import { EventStatus, PrismaClient } from '@prisma/client';
import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';

const prisma = new PrismaClient();
const router = Router();

type EventFields = {
  title: string;
  description: string;
  category: string;
  venue: string;
  date: Date;
  capacity: number;
  isFree: boolean;
  price: number | null;
};

const parseEventFields = (body: unknown, partial = false): Partial<EventFields> | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const values = body as Record<string, unknown>;
  const fields: Partial<EventFields> = {};

  for (const key of ['title', 'description', 'category', 'venue'] as const) {
    if (values[key] === undefined && partial) continue;
    if (typeof values[key] !== 'string' || !values[key].trim()) return null;
    fields[key] = values[key].trim();
  }

  if (values.date !== undefined || !partial) {
    const date = new Date(String(values.date ?? ''));
    if (!Number.isFinite(date.getTime())) return null;
    fields.date = date;
  }
  if (values.capacity !== undefined || !partial) {
    if (!Number.isInteger(values.capacity) || Number(values.capacity) < 1) return null;
    fields.capacity = Number(values.capacity);
  }
  if (values.isFree !== undefined || !partial) {
    if (typeof values.isFree !== 'boolean') return null;
    fields.isFree = values.isFree;
  }
  if (partial && values.isFree === false && values.price === undefined) return null;
  if (values.price !== undefined || !partial || values.isFree === true) {
    if (values.isFree === true) {
      fields.price = null;
    } else if (typeof values.price === 'number' && Number.isFinite(values.price) && values.price >= 0) {
      fields.price = values.price;
    } else {
      return null;
    }
  }

  return fields;
};

const isCompleteEventFields = (fields: Partial<EventFields>): fields is EventFields =>
  typeof fields.title === 'string' &&
  typeof fields.description === 'string' &&
  typeof fields.category === 'string' &&
  typeof fields.venue === 'string' &&
  fields.date instanceof Date &&
  typeof fields.capacity === 'number' &&
  typeof fields.isFree === 'boolean' &&
  (fields.price === null || typeof fields.price === 'number');

const sendError = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, message });
};

const getEventId = (req: Request): string | null =>
  typeof req.params.id === 'string' ? req.params.id : null;

// Public event queries never expose drafts, pending submissions, or rejected events.
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, requireRole('ORGANIZER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.event.findMany({
      where: { organizerId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { reviewedBy: { select: { firstname: true, lastname: true } } },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

router.get('/pending', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PENDING_APPROVAL },
      orderBy: { updatedAt: 'asc' },
      include: {
        organizer: { select: { firstname: true, lastname: true, email: true } },
      },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const event = await prisma.event.findFirst({
      where: { id, status: EventStatus.PUBLISHED },
    });
    if (!event) {
      sendError(res, 404, 'Event not found');
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('ORGANIZER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = parseEventFields(req.body);
    if (!fields || !isCompleteEventFields(fields)) {
      sendError(res, 400, 'Provide valid event details, capacity, and a valid free/paid setting and price');
      return;
    }
    const event = await prisma.event.create({
      data: {
        ...fields,
        availableCapacity: fields.capacity,
        organizerId: req.user!.id,
        status: EventStatus.DRAFT,
      },
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('ORGANIZER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const fields = parseEventFields(req.body, true);
    if (!fields || Object.keys(fields).length === 0) {
      sendError(res, 400, 'Provide valid event fields to update');
      return;
    }
    const current = await prisma.event.findFirst({
      where: {
        id,
        organizerId: req.user!.id,
        status: { in: [EventStatus.DRAFT, EventStatus.REJECTED] },
      },
      select: { status: true, reviewedAt: true },
    });
    if (!current) {
      sendError(res, 404, 'Editable event not found');
      return;
    }
    const updated = await prisma.event.updateMany({
      where: {
        id,
        organizerId: req.user!.id,
        status: current.status,
      },
      data: {
        ...fields,
        ...(fields.capacity !== undefined ? { availableCapacity: fields.capacity } : {}),
        ...(current.status === EventStatus.REJECTED && current.reviewedAt
          ? { updatedAt: new Date(Math.max(Date.now(), current.reviewedAt.getTime() + 1)) }
          : {}),
      },
    });
    if (!updated.count) {
      sendError(res, 404, 'Editable event not found');
      return;
    }
    const event = await prisma.event.findUnique({ where: { id } });
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/submit', requireAuth, requireRole('ORGANIZER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const current = await prisma.event.findFirst({
      where: {
        id,
        organizerId: req.user!.id,
        status: { in: [EventStatus.DRAFT, EventStatus.REJECTED] },
      },
      select: { status: true, reviewedAt: true, updatedAt: true },
    });
    if (!current) {
      sendError(res, 409, 'Only draft or corrected rejected events can be submitted for approval');
      return;
    }
    if (current.status === EventStatus.REJECTED && (!current.reviewedAt || current.updatedAt <= current.reviewedAt)) {
      sendError(res, 409, 'Edit the rejected event before resubmitting it');
      return;
    }
    const updated = await prisma.event.updateMany({
      where: {
        id,
        organizerId: req.user!.id,
        status: current.status,
      },
      data: {
        status: EventStatus.PENDING_APPROVAL,
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
    if (!updated.count) {
      sendError(res, 409, 'Only draft or rejected events can be submitted for approval');
      return;
    }
    const event = await prisma.event.findUnique({ where: { id } });
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cancel', requireAuth, requireRole('ORGANIZER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const updated = await prisma.event.updateMany({
      where: {
        id,
        organizerId: req.user!.id,
        status: { not: EventStatus.COMPLETED },
      },
      data: { status: EventStatus.CANCELLED },
    });
    if (!updated.count) {
      sendError(res, 404, 'Cancellable event not found');
      return;
    }
    const event = await prisma.event.findUnique({ where: { id } });
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('ORGANIZER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const deleted = await prisma.event.deleteMany({
      where: { id, organizerId: req.user!.id, status: EventStatus.DRAFT },
    });
    if (!deleted.count) {
      sendError(res, 404, 'Draft event not found');
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/bookings', requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/vendors', requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

router.patch('/:id/approve', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const event = await prisma.$transaction(async transaction => {
      const updated = await transaction.event.updateMany({
        where: { id, status: EventStatus.PENDING_APPROVAL },
        data: {
          status: EventStatus.PUBLISHED,
          rejectionReason: null,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
      });
      if (!updated.count) return null;
      const reviewedEvent = await transaction.event.findUnique({ where: { id } });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedEventId: id,
          action: 'EVENT_APPROVED',
          outcome: 'published',
        },
      });
      return reviewedEvent;
    });
    if (!event) {
      sendError(res, 409, 'Only pending events can be approved');
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/reject', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getEventId(req);
    if (!id) {
      sendError(res, 400, 'A single event ID is required');
      return;
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) {
      sendError(res, 400, 'A rejection reason is required');
      return;
    }
    const event = await prisma.$transaction(async transaction => {
      const updated = await transaction.event.updateMany({
        where: { id, status: EventStatus.PENDING_APPROVAL },
        data: {
          status: EventStatus.REJECTED,
          rejectionReason: reason,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
      });
      if (!updated.count) return null;
      const reviewedEvent = await transaction.event.findUnique({ where: { id } });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedEventId: id,
          action: 'EVENT_REJECTED',
          outcome: reason,
        },
      });
      return reviewedEvent;
    });
    if (!event) {
      sendError(res, 409, 'Only pending events can be rejected');
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

export default router;
