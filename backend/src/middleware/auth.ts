import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, ProfileApprovalStatus } from '@prisma/client';
import { config } from '@/config/index';
import type { UserRole } from '@/types/user';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole; mustChangePassword: boolean };
    }
  }
}

interface JwtPayload {
  sub: string;
  role: UserRole;
}

// ─── requireAuth ─────────────────────────────────────────────────────────────
// Verifies the signed JWT from the httpOnly cookie and attaches req.user.
// Returns 401 when no cookie is present or the token is invalid/expired.

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.auth_token;

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired session' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true, mustChangePassword: true },
  });

  if (!user || !user.isActive) {
    res.status(401).json({ success: false, message: 'Invalid or expired session' });
    return;
  }

  req.user = {
    id: user.id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };

  if (user.mustChangePassword && !(req.path === '/me' || req.path === '/change-password')) {
    res.status(403).json({ success: false, message: 'Change your temporary password before continuing' });
    return;
  }
  next();
};

// ─── requireRole ─────────────────────────────────────────────────────────────
// Must be used after requireAuth.
// Returns 403 when the authenticated user's role is not in the allowed list.

export const requireRole = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    next();
  };

export const requireApprovedOrganizerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        firstname: true,
        lastname: true,
        organizationName: true,
        profileApprovalStatus: true,
      },
    });

    if (
      !profile ||
      !profile.firstname.trim() ||
      !profile.lastname.trim() ||
      !profile.organizationName?.trim() ||
      profile.profileApprovalStatus !== ProfileApprovalStatus.APPROVED
    ) {
      res.status(403).json({
        success: false,
        message: 'Please complete the profile and try again. Your profile must be approved by an admin before creating events.',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ─── requireOwnership ────────────────────────────────────────────────────────
// Checks that req.user.id matches the owner id resolved by the provided getter.
// Privileged roles (ADMIN, PLATFORM_ADMIN) bypass the ownership check.
// Returns 403 when the authenticated user does not own the resource.

export const requireOwnership = (
  getOwnerId: (req: Request) => Promise<string | null>
) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const privileged: UserRole[] = ['ADMIN', 'PLATFORM_ADMIN'];
      if (req.user && privileged.includes(req.user.role)) {
        next();
        return;
      }

      const ownerId = await getOwnerId(req);

      if (!ownerId || !req.user || req.user.id !== ownerId) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
