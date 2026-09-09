import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstname, lastname, email, password } = req.body;

    // Required fields
    if (!firstname || !lastname || !email || !password) {
      res.status(400).json({ success: false, message: 'firstname, lastname, email and password are required' });
      return;
    }

    // Email format
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'Invalid email address' });
      return;
    }

    // Password length
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }

    // Duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { firstname, lastname, email, passwordHash },
      select: { id: true, firstname: true, lastname: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
