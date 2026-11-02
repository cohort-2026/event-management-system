import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '@/config/index';
import { sendPasswordResetCode, sendVerificationCode } from '@/services/emailService';

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'auth_token';
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const SETUP_TOKEN_MAX_AGE_HOURS = 24;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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
  mustChangePassword: true,
  createdAt: true,
} as const;

const createOtp = (): string => randomInt(100000, 1000000).toString();

// ─── Register ────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstname, lastname, email: rawEmail, password } = req.body;

    const allow_self_registration = ['ATTENDEE', 'VENDOR', 'ORGANIZER'];
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

// ─── Password reset ────────────────────────────────────────────────────────

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawEmail = req.body.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    if (!email || !EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email address is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const genericResponse = {
      success: true,
      message: 'If an active account matches that email, a password reset code has been sent.',
    };
    if (!user?.isActive) {
      res.json(genericResponse);
      return;
    }

    if (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN') {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          affectedUserId: user.id,
          action: 'ADMIN_RECOVERY_REQUESTED',
          outcome: 'requested',
        },
      });
    }

    const existingReset = await prisma.passwordResetToken.findUnique({ where: { userId: user.id } });
    if (
      existingReset &&
      Date.now() - existingReset.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
    ) {
      res.json(genericResponse);
      return;
    }

    const code = createOtp();
    const codeHash = await bcrypt.hash(code, 12);
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: {
        tokenHash: codeHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        createdAt: new Date(),
      },
      create: {
        userId: user.id,
        tokenHash: codeHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });
    await sendPasswordResetCode(email, code);

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawEmail = req.body.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;
    const { code, password } = req.body;

    if (
      typeof email !== 'string' ||
      !EMAIL_REGEX.test(email) ||
      typeof code !== 'string' ||
      !/^\d{6}$/.test(code) ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      res.status(400).json({ success: false, message: 'A valid email, six-digit reset code and password of at least 8 characters are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    const resetCode = user
      ? await prisma.passwordResetToken.findUnique({ where: { userId: user.id } })
      : null;
    if (
      !resetCode ||
      resetCode.expiresAt <= new Date() ||
      resetCode.attempts >= MAX_OTP_ATTEMPTS
    ) {
      res.status(400).json({ success: false, message: 'This reset code is invalid or has expired' });
      return;
    }

    const codeMatches = await bcrypt.compare(code, resetCode.tokenHash);
    if (!codeMatches) {
      await prisma.passwordResetToken.updateMany({
        where: {
          id: resetCode.id,
          attempts: { lt: MAX_OTP_ATTEMPTS },
          expiresAt: { gt: new Date() },
        },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ success: false, message: 'This reset code is invalid or has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const wasReset = await prisma.$transaction(async transaction => {
      const consumedToken = await transaction.passwordResetToken.deleteMany({
        where: {
          id: resetCode.id,
          userId: resetCode.userId,
          tokenHash: resetCode.tokenHash,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_OTP_ATTEMPTS },
        },
      });

      if (consumedToken.count !== 1) return false;

      await transaction.user.update({
        where: { id: resetCode.userId },
        data: { passwordHash, mustChangePassword: false },
      });
      if (user && (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN')) {
        await transaction.auditLog.create({
          data: {
            actorId: user.id,
            affectedUserId: user.id,
            action: 'ADMIN_RECOVERY_COMPLETED',
            outcome: 'completed',
          },
        });
      }
      return true;
    });

    if (!wasReset) {
      res.status(400).json({ success: false, message: 'This reset code is invalid or has expired' });
      return;
    }

    res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      res.status(400).json({ success: false, message: 'Current password and a new password of 8-72 UTF-8 bytes are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    if (user.mustChangePassword && !STRONG_PASSWORD_REGEX.test(newPassword)) {
      res.status(400).json({
        success: false,
        message: 'Your permanent password must include uppercase, lowercase, a number, and a special character',
      });
      return;
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      res.status(400).json({ success: false, message: 'Choose a new password that differs from your current password' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updatedUser = await prisma.$transaction(async transaction => {
      await transaction.passwordResetToken.deleteMany({ where: { userId: user.id } });
      const updated = await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
        select: USER_SELECT,
      });
      if (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN') {
        await transaction.auditLog.create({
          data: {
            actorId: user.id,
            affectedUserId: user.id,
            action: 'ADMIN_PASSWORD_CHANGED',
            outcome: 'completed',
          },
        });
      }
      return updated;
    });

    const token = jwt.sign(
      { sub: updatedUser.id, role: updatedUser.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ success: true, data: updatedUser, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

export const completeOrganizerPasswordSetup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawEmail = req.body?.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const { token, password } = req.body ?? {};

    if (
      !EMAIL_REGEX.test(email) ||
      typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) ||
      typeof password !== 'string' || !STRONG_PASSWORD_REGEX.test(password) ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      res.status(400).json({
        success: false,
        message: 'A valid setup link and a password of 8-72 bytes with uppercase, lowercase, number and special characters are required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, mustChangePassword: true },
    });
    if (!user || user.role !== 'ORGANIZER' || !user.mustChangePassword) {
      res.status(400).json({ success: false, message: 'This password setup link is invalid or has expired' });
      return;
    }

    const setupToken = await prisma.passwordResetToken.findUnique({ where: { userId: user.id } });

    if (
      !setupToken ||
      setupToken.expiresAt <= new Date() ||
      setupToken.attempts >= MAX_OTP_ATTEMPTS ||
      Date.now() - setupToken.createdAt.getTime() > SETUP_TOKEN_MAX_AGE_HOURS * 60 * 60 * 1000
    ) {
      res.status(400).json({ success: false, message: 'This password setup link is invalid or has expired' });
      return;
    }

    if (!(await bcrypt.compare(token, setupToken.tokenHash))) {
      await prisma.passwordResetToken.updateMany({
        where: {
          id: setupToken.id,
          attempts: { lt: MAX_OTP_ATTEMPTS },
          expiresAt: { gt: new Date() },
        },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ success: false, message: 'This password setup link is invalid or has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const completed = await prisma.$transaction(async transaction => {
      const consumedToken = await transaction.passwordResetToken.deleteMany({
        where: {
          id: setupToken.id,
          userId: user.id,
          tokenHash: setupToken.tokenHash,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_OTP_ATTEMPTS },
        },
      });
      if (consumedToken.count !== 1) return false;

      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          affectedUserId: user.id,
          action: 'ORGANIZER_PASSWORD_SETUP_COMPLETED',
          outcome: 'completed',
        },
      });
      return true;
    });

    if (!completed) {
      res.status(400).json({ success: false, message: 'This password setup link is invalid or has expired' });
      return;
    }

    res.json({ success: true, message: 'Your password has been set. You can now sign in.' });
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
