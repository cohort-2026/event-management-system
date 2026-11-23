import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const configuredOrigin = new URL(config.clientUrl).origin;

export const protectCookieRequests = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  const fetchSite = req.get('sec-fetch-site');
  if ((origin && origin !== configuredOrigin) || (!origin && fetchSite === 'cross-site')) {
    res.status(403).json({ success: false, message: 'Request origin is not allowed' });
    return;
  }

  next();
};
