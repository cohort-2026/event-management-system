import { Prisma, PrismaClient, Role } from '@prisma/client';
import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';

const prisma = new PrismaClient();
const router = Router();

const USER_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  email: true,
  role: true,
  isActive: true,
  emailVerified: true,
  mustChangePassword: true,
  createdAt: true,
} as const;

const PRIVILEGED_ROLES: Role[] = [Role.ADMIN, Role.PLATFORM_ADMIN];
const ASSIGNABLE_ROLES: Role[] = [Role.ATTENDEE, Role.VENDOR, Role.ORGANIZER, Role.MANAGEMENT];

const singleQueryValue = (value: unknown): string | null =>
  typeof value === 'string' ? value.trim() || null : null;

const parseDateFilter = (value: string | null, endOfDay = false): Date | null | undefined => {
  if (value === null) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
    return date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const isRole = (value: string): value is Role =>
  Object.values(Role).some(role => role === value);

const sendError = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, message });
};

const getUserId = (req: Request): string | null =>
  typeof req.params.id === 'string' ? req.params.id : null;

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterKeys = ['search', 'role', 'status', 'registeredFrom', 'registeredTo', 'page', 'pageSize'] as const;
    if (filterKeys.some(key => req.query[key] !== undefined && typeof req.query[key] !== 'string')) {
      sendError(res, 400, 'Each user filter must be supplied once as a string');
      return;
    }
    const search = singleQueryValue(req.query.search);
    const rawRole = singleQueryValue(req.query.role);
    const rawStatus = singleQueryValue(req.query.status);
    const rawFrom = singleQueryValue(req.query.registeredFrom);
    const rawTo = singleQueryValue(req.query.registeredTo);
    const from = parseDateFilter(rawFrom);
    const to = parseDateFilter(rawTo, true);
    const pageValue = singleQueryValue(req.query.page) ?? '1';
    const pageSizeValue = singleQueryValue(req.query.pageSize) ?? '25';
    const page = Number(pageValue);
    const pageSize = Number(pageSizeValue);

    if (rawRole && (!isRole(rawRole) || !ASSIGNABLE_ROLES.includes(rawRole))) {
      sendError(res, 400, 'Invalid role filter');
      return;
    }
    if (rawStatus && rawStatus !== 'active' && rawStatus !== 'inactive') {
      sendError(res, 400, 'Status must be active or inactive');
      return;
    }
    if (from === undefined || to === undefined) {
      sendError(res, 400, 'Registration date filters must be valid dates');
      return;
    }
    if (from && to && from > to) {
      sendError(res, 400, 'Registration start date must not be after the end date');
      return;
    }
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      sendError(res, 400, 'Page must be positive and pageSize must be between 1 and 100');
      return;
    }

    const roleFilter = rawRole && isRole(rawRole) && ASSIGNABLE_ROLES.includes(rawRole) ? rawRole : null;
    const where: Prisma.UserWhereInput = {
      role: roleFilter ? { in: [roleFilter] } : { in: ASSIGNABLE_ROLES },
      ...(rawStatus ? { isActive: rawStatus === 'active' } : {}),
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(search
        ? {
            OR: [
              { firstname: { contains: search, mode: 'insensitive' } },
              { lastname: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getUserId(req);
    if (!id) {
      sendError(res, 400, 'A single user ID is required');
      return;
    }
    const user = await prisma.user.findFirst({
      where: { id, role: { notIn: PRIVILEGED_ROLES } },
      select: USER_SELECT,
    });
    if (!user) {
      sendError(res, 404, 'User not found');
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getUserId(req);
    if (!id) {
      sendError(res, 400, 'A single user ID is required');
      return;
    }
    const { firstname, lastname } = req.body ?? {};
    const data: { firstname?: string; lastname?: string } = {};
    if (firstname !== undefined) {
      if (typeof firstname !== 'string' || !firstname.trim()) {
        sendError(res, 400, 'First name must not be empty');
        return;
      }
      data.firstname = firstname.trim();
    }
    if (lastname !== undefined) {
      if (typeof lastname !== 'string' || !lastname.trim()) {
        sendError(res, 400, 'Last name must not be empty');
        return;
      }
      data.lastname = lastname.trim();
    }
    if (Object.keys(data).length === 0) {
      sendError(res, 400, 'Provide a first name or last name to update');
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const updated = await transaction.user.updateMany({
        where: { id, role: { notIn: PRIVILEGED_ROLES } },
        data,
      });
      if (updated.count !== 1) return null;
      const user = await transaction.user.findUnique({ where: { id }, select: USER_SELECT });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: id,
          action: 'USER_PROFILE_UPDATED',
          outcome: 'name_updated',
        },
      });
      return user;
    });
    if (!result) {
      sendError(res, 404, 'User not found or protected account');
      return;
    }
    res.json({ success: true, data: result, message: 'User profile updated' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getUserId(req);
    const rawRole = typeof req.body?.role === 'string' ? req.body.role : '';
    if (!id) {
      sendError(res, 400, 'A single user ID is required');
      return;
    }
    if (!isRole(rawRole) || !ASSIGNABLE_ROLES.includes(rawRole)) {
      sendError(res, 400, 'Role must be ATTENDEE, VENDOR, ORGANIZER, or MANAGEMENT');
      return;
    }
    if (id === req.user!.id) {
      sendError(res, 400, 'You cannot change your own role');
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const target = await transaction.user.findFirst({
        where: { id, role: { notIn: PRIVILEGED_ROLES } },
        select: { role: true },
      });
      if (!target) return null;
      const updated = await transaction.user.updateMany({
        where: { id, role: target.role },
        data: { role: rawRole },
      });
      if (updated.count !== 1) return null;
      const user = await transaction.user.findUnique({ where: { id }, select: USER_SELECT });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: id,
          action: 'USER_ROLE_CHANGED',
          outcome: `${target.role}->${rawRole}`,
        },
      });
      return user;
    });
    if (!result) {
      sendError(res, 404, 'User not found or protected account');
      return;
    }
    res.json({ success: true, data: result, message: 'User role updated' });
  } catch (err) {
    next(err);
  }
});

const updateAccountStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getUserId(req);
    const { isActive } = req.body ?? {};
    if (!id) {
      sendError(res, 400, 'A single user ID is required');
      return;
    }
    if (typeof isActive !== 'boolean') {
      sendError(res, 400, 'isActive must be a boolean');
      return;
    }
    if (id === req.user!.id && !isActive) {
      sendError(res, 400, 'You cannot deactivate your own account');
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      const updated = await transaction.user.updateMany({
        where: { id, role: { notIn: PRIVILEGED_ROLES }, isActive: !isActive },
        data: { isActive },
      });
      if (updated.count !== 1) return null;
      const user = await transaction.user.findUnique({ where: { id }, select: USER_SELECT });
      await transaction.auditLog.create({
        data: {
          actorId: req.user!.id,
          affectedUserId: id,
          action: isActive ? 'USER_ACCOUNT_REACTIVATED' : 'USER_ACCOUNT_DEACTIVATED',
          outcome: isActive ? 'reactivated' : 'deactivated',
        },
      });
      return user;
    });
    if (!result) {
      sendError(res, 404, 'User not found, protected account, or account already has that status');
      return;
    }
    res.json({ success: true, data: result, message: `User account ${isActive ? 'reactivated' : 'deactivated'}` });
  } catch (err) {
    next(err);
  }
};

router.patch('/:id/status', updateAccountStatus);
router.patch('/:id/deactivate', updateAccountStatus);

export default router;
