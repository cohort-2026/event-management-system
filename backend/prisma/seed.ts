import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const seedUsers = [
  { firstname: 'Platform', lastname: 'Admin',  email: 'platform.admin@example.com',  role: Role.PLATFORM_ADMIN, password: 'PlatformAdmin@123' },
  { firstname: 'Admin', lastname: 'User', email: 'admin@example.com',           role: Role.ADMIN,          password: 'Admin@123'         },
  { firstname: 'Management', lastname: 'User', email: 'management@example.com',      role: Role.MANAGEMENT,     password: 'Management@123'    },
  { firstname: 'Organizer', lastname: 'User', email: 'organizer@example.com',       role: Role.ORGANIZER,      password: 'Organizer@123'     },
  { firstname: 'Vendor', lastname: 'User', email: 'vendor@example.com',          role: Role.VENDOR,         password: 'Vendor@123'        },
  { firstname: 'Attendee', lastname: 'User', email: 'attendee@example.com',        role: Role.ATTENDEE,       password: 'Attendee@123'      },
];

async function main() {
  console.log('Seeding users...');

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { firstname: u.firstname, lastname: u.lastname, email: u.email, passwordHash, role: u.role },
    });

    console.log(`  ✓ ${u.role} — ${u.email}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e);  })
  .finally(() => prisma.$disconnect());
