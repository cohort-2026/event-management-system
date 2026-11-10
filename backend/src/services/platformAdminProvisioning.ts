import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { config } from '../config/index';

const prisma = new PrismaClient();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function provisionInitialPlatformAdmin(): Promise<void> {
  const values = [
    config.platformAdminEmail,
    config.platformAdminFirstname,
    config.platformAdminLastname,
    config.platformAdminInitialPassword,
  ];

  if (values.every(value => value === undefined)) {
    console.info('Initial Platform Admin provisioning is not configured.');
    return;
  }

  if (values.some(value => !value)) {
    throw new Error('Set PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_FIRSTNAME, PLATFORM_ADMIN_LASTNAME and PLATFORM_ADMIN_INITIAL_PASSWORD together.');
  }

  const { platformAdminEmail: email, platformAdminFirstname: firstname,
    platformAdminLastname: lastname, platformAdminInitialPassword: password } = config;
  if (!email || !firstname || !lastname || !password || !emailPattern.test(email) || password.length < 12) {
    throw new Error('Initial Platform Admin configuration is invalid; use a valid email and a password of at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.$transaction(async transaction => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(637149201)`;

    const existing = await transaction.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== Role.PLATFORM_ADMIN) {
        throw new Error('PLATFORM_ADMIN_EMAIL is already registered to a non-Platform Admin account.');
      }
      return 'configured_account_exists';
    }

    const platformAdminExists = await transaction.user.findFirst({ where: { role: Role.PLATFORM_ADMIN } });
    if (platformAdminExists) return 'another_account_exists';

    const created = await transaction.user.create({
      data: {
        firstname,
        lastname,
        email,
        passwordHash,
        role: Role.PLATFORM_ADMIN,
        emailVerified: true,
        mustChangePassword: false,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: created.id,
        affectedUserId: created.id,
        action: 'PLATFORM_ADMIN_BOOTSTRAPPED',
        outcome: 'created_from_deployment_configuration',
      },
    });
    return 'created';
  });

  if (result === 'configured_account_exists') {
    console.info('Configured Platform Admin account already exists; leaving its credentials unchanged.');
  } else if (result === 'another_account_exists') {
    console.info('A Platform Admin account already exists; initial provisioning was skipped.');
  } else {
    console.info('Initial Platform Admin account provisioned. Change its configured password after first sign-in.');
  }
}
