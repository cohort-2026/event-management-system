import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@/types/user';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}

export const authenticate = (_req: Request, res: Response, next: NextFunction) => {
  // TODO: verify JWT from Authorization header and attach req.user
  next();
};

export const authorize = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    next();
  };
