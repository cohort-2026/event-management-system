import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/index';
import type { UserRole } from '@/types/user';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
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

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.auth_token;

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
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
