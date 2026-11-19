import rateLimit from 'express-rate-limit';

const json429 = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) =>
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait and try again.',
    errors: [],
  });

// Strict limit for login — 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

// Registration — 5 per hour per IP (prevents account farming)
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

// OTP / code endpoints — 10 per 15 minutes per IP
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});
