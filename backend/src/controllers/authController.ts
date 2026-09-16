import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '@/config/index';
import { sendVerificationCode } from '@/services/emailService';

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'auth_token';
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day in ms
};

const USER_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

const createOtp = (): string => randomInt(100000, 1000000).toString();

// ─── Register ────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstname, lastname, email: rawEmail, password } = req.body;

    const allow_self_registration = ['ATTENDEE','VENDOR']
    const role = allow_self_registration.includes(req.body.role) ? req.body.role : 'ATTENDEE';
    
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    if (!firstname || !lastname || !email || !role || !password) {
      res.status(400).json({ success: false, message: 'firstname, lastname, email, role and password are required' });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'Invalid email address' });
      return;
    }

    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { firstname, lastname, email, role, passwordHash },
      select: USER_SELECT,
    });

    const code = createOtp();
    const codeHash = await bcrypt.hash(code, 12);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await sendVerificationCode(email, code);

    res.status(201).json({
      success: true,
      message: 'Account created. Check your email for the verification code.',
      data: { email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'email and password are required' });
      return;
    }

    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time compare even when user is not found to avoid timing attacks
    const dummyHash = '$2a$12$invalidhashfortimingprotectiononly000000000000000000000';
    const passwordHash = user?.passwordHash ?? dummyHash;
    const match = await bcrypt.compare(password, passwordHash);

    if (!user || !match) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'This account is inactive' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ success: false, message: 'Please verify your email before signing in' });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    res.cookie(COOKIE_NAME, token, cookieOptions);

    const { passwordHash: _omit, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
};

// ─── Verify email ───────────────────────────────────────────────────────────

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email: rawEmail, code } = req.body;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    if (!email || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      res.status(400).json({ success: false, message: 'A valid email and six-digit code are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      return;
    }

    if (user.emailVerified) {
      res.json({ success: true, message: 'Email is already verified' });
      return;
    }

    const verification = await prisma.emailVerification.findUnique({ where: { userId: user.id } });
    if (
      !verification ||
      verification.expiresAt < new Date() ||
      verification.attempts >= MAX_OTP_ATTEMPTS
    ) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      return;
    }

    const valid = await bcrypt.compare(code, verification.codeHash);
    if (!valid) {
      await prisma.emailVerification.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
      prisma.emailVerification.delete({ where: { userId: user.id } }),
    ]);

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Resend verification email ─────────────────────────────────────────────

export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawEmail = req.body.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    if (!email || !EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email address is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.emailVerified) {
      res.json({ success: true, message: 'If the account can be verified, a new code has been sent.' });
      return;
    }

    const existingVerification = await prisma.emailVerification.findUnique({ where: { userId: user.id } });
    if (
      existingVerification &&
      Date.now() - existingVerification.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
    ) {
      const retryAfter = Math.ceil(
        (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - existingVerification.createdAt.getTime())) / 1000
      );
      res.status(429).json({
        success: false,
        message: `Please wait ${retryAfter} seconds before requesting another code`,
        retryAfter,
      });
      return;
    }

    const code = createOtp();
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { userId: user.id },
      update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
      create: { userId: user.id, codeHash, expiresAt },
    });

    await sendVerificationCode(email, code);

    res.json({
      success: true,
      message: 'A new verification code has been sent',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ success: true, message: 'Logged out' });
};

// ─── Me ──────────────────────────────────────────────────────────────────────

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: USER_SELECT,
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
