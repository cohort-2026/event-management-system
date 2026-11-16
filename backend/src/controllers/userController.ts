import { Request, Response, NextFunction } from 'express';
import { Prisma, Role, VendorProfileStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const USER_SAFE_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  email: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
} as const;

const USER_DETAIL_SELECT = {
  ...USER_SAFE_SELECT,
  organizationName: true,
  organizationEmail: true,
  organizationRegistrationNumber: true,
  organizationDescription: true,
  phone: true,
  profileApprovalStatus: true,
  profileRejectionReason: true,
  vendorProfile: {
    select: {
      status: true,
      businessName: true,
      businessDescription: true,
      businessRegistrationNumber: true,
      contactPerson: true,
      contactEmail: true,
      contactPhone: true,
      productsServices: true,
    },
  },
} as const;

const USER_LIST_QUERY_KEYS = new Set(['page', 'limit', 'search', 'role', 'status', 'sortBy', 'sortOrder']);
const USER_SORT_FIELDS = ['createdAt', 'firstname', 'lastname', 'email', 'role'] as const;
type UserSortField = typeof USER_SORT_FIELDS[number];
type UserOrder = 'asc' | 'desc';

const readQueryString = (req: Request, key: string): string | undefined | null => {
  const value = req.query[key];
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value.trim() : null;
};

const readUserListFilters = (
  req: Request,
): { page: number; limit: number; search: string; role?: Role; isActive?: boolean; sortBy: UserSortField; sortOrder: UserOrder } | null => {
  if (Object.keys(req.query).some(key => !USER_LIST_QUERY_KEYS.has(key))) return null;
  const search = readQueryString(req, 'search');
  const role = readQueryString(req, 'role');
  const status = readQueryString(req, 'status');
  const rawSortBy = readQueryString(req, 'sortBy');
  const rawSortOrder = readQueryString(req, 'sortOrder');
  const sortBy = rawSortBy === undefined ? 'createdAt' : rawSortBy;
  const sortOrder = rawSortOrder === undefined ? 'desc' : rawSortOrder;
  if (
    search === null ||
    (search !== undefined && search.length > 100) ||
    role === null ||
    (role !== undefined && !Object.values(Role).some(value => value === role)) ||
    status === null ||
    (status !== undefined && !['active', 'inactive'].includes(status.toLowerCase())) ||
    sortBy === null ||
    !USER_SORT_FIELDS.some(value => value === sortBy) ||
    sortOrder === null ||
    !['asc', 'desc'].includes(sortOrder.toLowerCase())
  ) return null;

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  return {
    page,
    limit,
    search: search ?? '',
    ...(role ? { role: role as Role } : {}),
    ...(status ? { isActive: status.toLowerCase() === 'active' } : {}),
    sortBy: sortBy as UserSortField,
    sortOrder: sortOrder.toLowerCase() as UserOrder,
  };
};

const lockActiveAdmins = async (transaction: Prisma.TransactionClient): Promise<void> => {
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "users"
    WHERE "role" = 'ADMIN'::"Role" AND "is_active" = TRUE
    ORDER BY "id"
    FOR UPDATE
  `;
};

const recordAdminAction = async (
  transaction: Prisma.TransactionClient,
  actorId: string,
  affectedUserId: string,
  action: string,
  outcome: string,
): Promise<void> => {
  await transaction.auditLog.create({
    data: { actorId, affectedUserId, action, outcome },
  });
};

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = readUserListFilters(req);
    if (!filters) {
      res.status(400).json({
        success: false,
        message: 'Invalid user filters',
        errors: [{ field: 'query', message: 'Use valid search, role, status, sortBy and sortOrder values' }],
      });
      return;
    }

    const where: Prisma.UserWhereInput = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search ? {
        OR: [
          { firstname: { contains: filters.search, mode: 'insensitive' } },
          { lastname: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { organizationName: { contains: filters.search, mode: 'insensitive' } },
        ],
      } : {}),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
      { [filters.sortBy]: filters.sortOrder },
      { id: 'asc' },
    ];
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SAFE_SELECT,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        pageSize: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid user ID is required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id }, select: USER_DETAIL_SELECT });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    const body = req.body as Record<string, unknown>;
    const roleValue = body.role;
    if (
      !id ||
      Object.keys(body).some(key => key !== 'role') ||
      typeof roleValue !== 'string' ||
      !Object.values(Role).some(value => value === roleValue)
    ) {
      res.status(400).json({
        success: false,
        message: 'A valid user UUID and one of the four supported roles are required',
        errors: [{ field: 'role', message: 'Role must be ATTENDEE, VENDOR, ORGANIZER or ADMIN' }],
      });
      return;
    }
    if (id === req.user!.id) {
      res.status(409).json({ success: false, message: 'You cannot change your own role' });
      return;
    }
    const role = roleValue as Role;

    const result = await prisma.$transaction(async transaction => {
      await lockActiveAdmins(transaction);
      const current = await transaction.user.findUnique({
        where: { id },
        select: { id: true, role: true, isActive: true },
      });
      if (!current) return { error: 'not_found' as const };
      if (current.role === role) return { error: 'unchanged' as const };

      if (current.role === Role.ADMIN && current.isActive && role !== Role.ADMIN) {
        const activeAdminCount = await transaction.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminCount <= 1) return { error: 'last_admin' as const };
      }

      const updated = await transaction.user.updateMany({
        where: { id, role: current.role, isActive: current.isActive },
        data: {
          role,
          ...(role === Role.ORGANIZER && current.role !== Role.ORGANIZER ? {
            profileApprovalStatus: 'PENDING_APPROVAL',
            profileRejectionReason: null,
          } : {}),
        },
      });
      if (updated.count !== 1) return { error: 'changed_concurrently' as const };

      if (role === Role.VENDOR && current.role !== Role.VENDOR) {
        await transaction.vendorProfile.updateMany({
          where: { userId: id },
          data: {
            status: VendorProfileStatus.DRAFT,
            rejectionReason: null,
            reviewedAt: null,
          },
        });
      }
      await recordAdminAction(transaction, req.user!.id, id, 'USER_ROLE_UPDATED', `${current.role}_TO_${role}`);
      const user = await transaction.user.findUniqueOrThrow({ where: { id }, select: USER_SAFE_SELECT });
      return { user };
    });

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      if (result.error === 'last_admin') {
        res.status(409).json({ success: false, message: 'The last active administrator cannot be demoted' });
        return;
      }
      if (result.error === 'unchanged') {
        res.status(409).json({ success: false, message: 'The user already has this role' });
        return;
      }
      res.status(409).json({ success: false, message: 'The user role changed concurrently; reload and try again' });
      return;
    }
    res.json({ success: true, data: result.user, message: 'User role updated.' });
  } catch (error) {
    next(error);
  }
};

const setUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction,
  isActive: boolean,
): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'A valid user ID is required' });
      return;
    }
    if (Object.keys(req.body as Record<string, unknown>).length > 0) {
      res.status(400).json({ success: false, message: 'This operation does not accept a request body' });
      return;
    }
    if (!isActive && id === req.user!.id) {
      res.status(409).json({ success: false, message: 'You cannot deactivate your own account' });
      return;
    }

    const result = await prisma.$transaction(async transaction => {
      await lockActiveAdmins(transaction);
      const current = await transaction.user.findUnique({
        where: { id },
        select: { id: true, role: true, isActive: true },
      });
      if (!current) return { error: 'not_found' as const };
      if (current.isActive === isActive) return { error: 'unchanged' as const, current };

      if (!isActive && current.role === Role.ADMIN && current.isActive) {
        const activeAdminCount = await transaction.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminCount <= 1) return { error: 'last_admin' as const };
      }

      const updated = await transaction.user.updateMany({
        where: { id, role: current.role, isActive: current.isActive },
        data: { isActive },
      });
      if (updated.count !== 1) return { error: 'changed_concurrently' as const };
      await recordAdminAction(
        transaction,
        req.user!.id,
        id,
        isActive ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_DEACTIVATED',
        isActive ? 'activated' : 'deactivated',
      );
      const user = await transaction.user.findUniqueOrThrow({ where: { id }, select: USER_SAFE_SELECT });
      return { user };
    });

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      if (result.error === 'last_admin') {
        res.status(409).json({ success: false, message: 'The last active administrator cannot be deactivated' });
        return;
      }
      if (result.error === 'changed_concurrently') {
        res.status(409).json({ success: false, message: 'The user account changed concurrently; reload and try again' });
        return;
      }
      res.json({
        success: true,
        data: result.current,
        message: `User account is already ${isActive ? 'active' : 'inactive'}.`,
      });
      return;
    }
    res.json({
      success: true,
      data: result.user,
      message: `User account ${isActive ? 'activated' : 'deactivated'}.`,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = (req: Request, res: Response, next: NextFunction): Promise<void> =>
  setUserActive(req, res, next, false);

export const activateUser = (req: Request, res: Response, next: NextFunction): Promise<void> =>
  setUserActive(req, res, next, true);
