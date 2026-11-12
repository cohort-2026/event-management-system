import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { config } from '../config/index';

const prisma = new PrismaClient();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function provisionInitialAdmin(): Promise<void> {
  const values = [
    config.adminEmail,
    config.adminFirstname,
    config.adminLastname,
    config.adminInitialPassword,
  ];

  if (values.every(value => value === undefined)) {
    console.info('Initial Admin provisioning is not configured.');
    return;
  }

  if (values.some(value => !value)) {
    throw new Error(
      'Set ADMIN_EMAIL, ADMIN_FIRSTNAME, ADMIN_LASTNAME and ADMIN_INITIAL_PASSWORD together.',
    );
  }

  const { adminEmail: email, adminFirstname: firstname,
    adminLastname: lastname, adminInitialPassword: password } = config;

  if (!email || !firstname || !lastname || !password || !emailPattern.test(email) || password.length < 12) {
    throw new Error(
      'Initial Admin configuration is invalid; use a valid email and a password of at least 12 characters.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async transaction => {
    // Advisory lock prevents a race condition on simultaneous startup
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(637149201)`;

    const existing = await transaction.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== Role.ADMIN) {
        throw new Error('ADMIN_EMAIL is already registered to a non-Admin account.');
      }
      return 'configured_account_exists';
    }

    const adminExists = await transaction.user.findFirst({ where: { role: Role.ADMIN } });
    if (adminExists) return 'another_account_exists';

    const created = await transaction.user.create({
      data: {
        firstname,
        lastname,
        email,
        passwordHash,
        role: Role.ADMIN,
        emailVerified: true,
        mustChangePassword: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        actorId: created.id,
        affectedUserId: created.id,
        action: 'ADMIN_BOOTSTRAPPED',
        outcome: 'created_from_deployment_configuration',
      },
    });

    return 'created';
  });

  if (result === 'configured_account_exists') {
    console.info('Configured Admin account already exists; leaving its credentials unchanged.');
  } else if (result === 'another_account_exists') {
    console.info('An Admin account already exists; initial provisioning was skipped.');
  } else {
    console.info('Initial Admin account provisioned. The Admin must change the temporary password on first sign-in.');
  }
}
