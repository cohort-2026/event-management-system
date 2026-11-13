import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../config/index';

const isProd = config.nodeEnv === 'production';

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Resource not found', errors: [] });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (isProd) {
    const detail = err instanceof Prisma.PrismaClientKnownRequestError
      ? `${err.name} ${err.code}`
      : err instanceof Error ? err.name : 'Unknown error';
    console.error('Request failed:', detail);
  } else {
    console.error(err);
  }

  const respond = (status: number, message: string): void => {
    res.status(status).json({ success: false, message, errors: [] });
  };

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        respond(409, 'A record with that value already exists');
        return;
      case 'P2025':
        respond(404, 'Record not found');
        return;
      case 'P2003':
        respond(409, 'Operation violates a data relationship constraint');
        return;
      case 'P2014':
        respond(409, 'Operation violates a required relation');
        return;
      default:
        respond(500, isProd ? 'Database error' : `Database error: ${err.code}`);
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    respond(400, isProd ? 'Invalid request data' : err.message);
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    respond(503, 'Service temporarily unavailable');
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    respond(400, 'Invalid JSON in request body');
    return;
  }

  if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') {
    respond(413, 'Request body is too large');
    return;
  }

  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = err.status;
    switch (status) {
      case 400:
        respond(400, 'Invalid request data');
        return;
      case 401:
        respond(401, 'Authentication required');
        return;
      case 403:
        respond(403, 'Forbidden');
        return;
      case 404:
        respond(404, 'Resource not found');
        return;
      case 409:
        respond(409, 'Conflict');
        return;
      case 413:
        respond(413, 'Request body is too large');
        return;
      case 429:
        respond(429, 'Too many requests');
        return;
    }
  }

  respond(500, isProd || !(err instanceof Error) ? 'Internal server error' : err.message);
};
