import { Prisma, PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const publicEventSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  venue: true,
  date: true,
  capacity: true,
  availableCapacity: true,
  isFree: true,
  price: true,
  status: true,
  organizerId: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } },
    },
  },
} satisfies Prisma.EventSelect;

function publicEvent(event: Prisma.EventGetPayload<{ select: typeof publicEventSelect }>) {
  const { _count, price, ...details } = event;
  return {
    ...details,
    price: price === null ? undefined : Number(price),
    popularity: _count.bookings,
    bookingOpen: event.availableCapacity > 0 && event.date.getTime() > Date.now(),
  };
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function parsePage(value: unknown, fallback: number): number | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined | null {
  if (value === undefined || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

// Public event discovery. Only approved, published events are exposed.
router.get('/', async (req, res) => {
  const page = parsePage(req.query.page, 1);
  const pageSize = parsePage(req.query.pageSize, DEFAULT_PAGE_SIZE);
  const search = queryString(req.query.search);
  const category = queryString(req.query.category);
  const location = queryString(req.query.location);
  const free = queryString(req.query.free);
  const sort = queryString(req.query.sort) ?? 'date';
  const dateFrom = parseDate(queryString(req.query.dateFrom));
  const dateTo = parseDate(queryString(req.query.dateTo), true);

  if (page === undefined || pageSize === undefined || pageSize > MAX_PAGE_SIZE) {
    res.status(400).json({ success: false, message: `page must be positive and pageSize must be between 1 and ${MAX_PAGE_SIZE}` });
    return;
  }
  if (free !== undefined && free !== 'true' && free !== 'false') {
    res.status(400).json({ success: false, message: 'free must be true or false' });
    return;
  }
  if (!['date', 'popularity', 'recent'].includes(sort)) {
    res.status(400).json({ success: false, message: 'sort must be date, popularity or recent' });
    return;
  }
  if (dateFrom === null || dateTo === null || (dateFrom && dateTo && dateFrom > dateTo)) {
    res.status(400).json({ success: false, message: 'Provide a valid date range using YYYY-MM-DD values' });
    return;
  }

  const where: Prisma.EventWhereInput = {
    status: 'PUBLISHED',
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(category && { category }),
    ...(location && { venue: { contains: location, mode: 'insensitive' } }),
    ...(free !== undefined && { isFree: free === 'true' }),
    ...((dateFrom || dateTo) && {
      date: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) },
    }),
  };
  const orderBy: Prisma.EventOrderByWithRelationInput[] = sort === 'popularity'
    ? [{ bookings: { _count: 'desc' } }, { date: 'asc' }]
    : sort === 'recent'
      ? [{ createdAt: 'desc' }, { id: 'asc' }]
      : [{ date: 'asc' }, { id: 'asc' }];

  const [events, total, categories, locations] = await Promise.all([
    prisma.event.findMany({
      where,
      select: publicEventSelect,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
    prisma.event.groupBy({ by: ['category'], where: { status: 'PUBLISHED' }, orderBy: { category: 'asc' } }),
    prisma.event.groupBy({ by: ['venue'], where: { status: 'PUBLISHED' }, orderBy: { venue: 'asc' } }),
  ]);

  res.json({
    events: events.map(publicEvent),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    categories: categories.map(item => item.category),
    locations: locations.map(item => item.venue),
  });
});

router.get('/:id', async (req, res) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    select: publicEventSelect,
  });
  if (!event) {
    res.status(404).json({ success: false, message: 'Event not found' });
    return;
  }
  res.json(publicEvent(event));
});

// ── Organizer ─────────────────────────────────────────────────────────────────
// POST   /api/events                    Create a draft event
// PUT    /api/events/:id                Edit own event
// PATCH  /api/events/:id/submit         Submit own event for approval
// PATCH  /api/events/:id/cancel         Cancel own event
// DELETE /api/events/:id                Delete own draft event
// GET    /api/events/:id/bookings        View registrations for own event
// GET    /api/events/:id/vendors        View vendor applications for own event
router.post('/',                requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.put('/:id',              requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.patch('/:id/submit',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.patch('/:id/cancel',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.delete('/:id',           requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/bookings',     requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));
router.get('/:id/vendors',      requireAuth, requireRole('ORGANIZER'), (_req, res) => res.sendStatus(501));

// ── Admin ─────────────────────────────────────────────────────────────────────
// PATCH  /api/events/:id/approve        Approve a pending event
// PATCH  /api/events/:id/reject         Reject a pending event
router.patch('/:id/approve',    requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));
router.patch('/:id/reject',     requireAuth, requireRole('ADMIN'), (_req, res) => res.sendStatus(501));

export default router;
