import { Request, Response, NextFunction } from 'express';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string): boolean =>
  value.length <= 254 && EMAIL_PATTERN.test(value);

export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

export const validateUuidParam = (
  _req: Request,
  res: Response,
  next: NextFunction,
  value: string,
): void => {
  if (!isUuid(value)) {
    res.status(400).json({
      success: false,
      message: 'A valid UUID is required',
      errors: [{ field: 'id', message: 'Must be a valid UUID' }],
    });
    return;
  }
  next();
};

export const validatePaginationQuery = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  for (const [field, maximum] of [['page', Number.MAX_SAFE_INTEGER], ['limit', 100]] as const) {
    const raw = req.query[field];
    if (raw === undefined) continue;

    if (
      typeof raw !== 'string' ||
      !/^[1-9]\d*$/.test(raw) ||
      !Number.isSafeInteger(Number(raw)) ||
      Number(raw) > maximum
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: [{ field, message: field === 'limit'
          ? 'Must be a positive integer no greater than 100'
          : 'Must be a positive integer' }],
      });
      return;
    }
  }
  next();
};

export const validateBodyShape = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.body === undefined) {
    req.body = {};
    next();
    return;
  }
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object',
      errors: [],
    });
    return;
  }
  next();
};
