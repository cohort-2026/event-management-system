import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/index';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const message = config.nodeEnv === 'production'
    ? 'Internal Server Error'
    : (err.message ?? 'Internal Server Error');
  res.status(500).json({ success: false, message });
};
