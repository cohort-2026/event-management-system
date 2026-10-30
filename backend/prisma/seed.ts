import { EventStatus, EventType, Prisma, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { provisionInitialPlatformAdmin } from '../src/services/platformAdminProvisioning';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const seedUsers = [
  { firstname: 'Admin', lastname: 'User', email: 'admin@example.com',           role: Role.ADMIN,          password: 'Admin@123'         },
  { firstname: 'Management', lastname: 'User', email: 'management@example.com',      role: Role.MANAGEMENT,     password: 'Management@123'    },
  { firstname: 'Organizer', lastname: 'User', email: 'organizer@example.com',       role: Role.ORGANIZER,      password: 'Organizer@123'     },
  { firstname: 'Vendor', lastname: 'User', email: 'vendor@example.com',          role: Role.VENDOR,         password: 'Vendor@123'        },
  { firstname: 'Attendee', lastname: 'User', email: 'attendee@example.com',        role: Role.ATTENDEE,       password: 'Attendee@123'      },
];

const seedEvents = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    title: 'React Fundamentals Workshop',
    description: 'Hands-on session covering components, props, state and hooks.',
    category: 'Technology',
    venue: 'Sandton Convention Centre, Johannesburg',
    date: '2026-11-14T09:00:00+02:00',
    startTime: '2026-11-14T09:00:00+02:00',
    endTime: '2026-11-14T13:00:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: 'https://picsum.photos/seed/react/1200/600',
    capacity: 120,
    availableCapacity: 85,
    isFree: false,
    price: '250.00',
    status: EventStatus.PUBLISHED,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    title: 'Startup Pitch Night',
    description: 'Ten early-stage founders pitch to a panel of investors.',
    category: 'Business',
    venue: 'The Capital 20 West, Johannesburg',
    date: '2026-11-20T18:00:00+02:00',
    startTime: '2026-11-20T18:00:00+02:00',
    endTime: '2026-11-20T21:30:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: 'https://picsum.photos/seed/pitch/1200/600',
    capacity: 200,
    availableCapacity: 143,
    isFree: false,
    price: '150.00',
    status: EventStatus.PUBLISHED,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    title: 'Intro to Data Science (Online)',
    description: 'Beginner-friendly webinar on Python, pandas and visualisation.',
    category: 'Education',
    venue: 'Online',
    date: '2026-11-25T17:00:00+02:00',
    startTime: '2026-11-25T17:00:00+02:00',
    endTime: '2026-11-25T19:00:00+02:00',
    eventType: EventType.ONLINE,
    meetingDetails: 'https://meet.example.com/ds-intro (Passcode: 482915)',
    bannerImageUrl: 'https://picsum.photos/seed/datasci/1200/600',
    capacity: 500,
    availableCapacity: 312,
    isFree: true,
    price: null,
    status: EventStatus.PUBLISHED,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    title: 'Jozi Food & Music Festival',
    description: 'A full day of street food, live bands and local craft vendors.',
    category: 'Entertainment',
    venue: 'Newtown Junction, Johannesburg',
    date: '2026-12-05T11:00:00+02:00',
    startTime: '2026-12-05T11:00:00+02:00',
    endTime: '2026-12-05T22:00:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: 'https://picsum.photos/seed/food/1200/600',
    capacity: 1500,
    availableCapacity: 1120,
    isFree: false,
    price: '120.00',
    status: EventStatus.PUBLISHED,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    title: 'Women in Tech Summit',
    description: 'Talks, panels and networking for women building careers in tech.',
    category: 'Technology',
    venue: 'Hybrid: Wits University + Livestream',
    date: '2026-12-10T08:30:00+02:00',
    startTime: '2026-12-10T08:30:00+02:00',
    endTime: '2026-12-10T16:30:00+02:00',
    eventType: EventType.HYBRID,
    meetingDetails: 'Livestream link: https://stream.example.com/wit-summit',
    bannerImageUrl: 'https://picsum.photos/seed/wit/1200/600',
    capacity: 400,
    availableCapacity: 260,
    isFree: false,
    price: '350.00',
    status: EventStatus.PENDING_APPROVAL,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    title: 'Community Clean-Up Day',
    description: 'Join neighbours to clean up the local park. Gloves and bags provided.',
    category: 'Community',
    venue: 'Zoo Lake Park, Johannesburg',
    date: '2026-12-13T08:00:00+02:00',
    startTime: '2026-12-13T08:00:00+02:00',
    endTime: '2026-12-13T12:00:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: 'https://picsum.photos/seed/cleanup/1200/600',
    capacity: 80,
    availableCapacity: 80,
    isFree: true,
    price: null,
    status: EventStatus.PENDING_APPROVAL,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    title: 'Yoga & Wellness Retreat',
    description: 'A relaxing morning of guided yoga, meditation and healthy brunch.',
    category: 'Health & Wellness',
    venue: 'Melrose Arch Piazza, Johannesburg',
    date: '2027-01-17T07:00:00+02:00',
    startTime: '2027-01-17T07:00:00+02:00',
    endTime: '2027-01-17T12:00:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: 'https://picsum.photos/seed/yoga/1200/600',
    capacity: 60,
    availableCapacity: 60,
    isFree: false,
    price: '200.00',
    status: EventStatus.DRAFT,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    title: 'Cybersecurity Essentials Webinar',
    description: 'Learn practical steps to protect yourself and your team online.',
    category: 'Technology',
    venue: 'Online',
    date: '2027-01-22T18:00:00+02:00',
    startTime: '2027-01-22T18:00:00+02:00',
    endTime: '2027-01-22T19:30:00+02:00',
    eventType: EventType.ONLINE,
    meetingDetails: 'https://meet.example.com/cyber-101',
    bannerImageUrl: 'https://picsum.photos/seed/cyber/1200/600',
    capacity: 1000,
    availableCapacity: 1000,
    isFree: true,
    price: null,
    status: EventStatus.DRAFT,
    rejectionReason: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    title: 'Weekend Crypto Trading Bootcamp',
    description: 'Learn to trade crypto assets with guaranteed profit strategies.',
    category: 'Business',
    venue: 'Rosebank Hotel, Johannesburg',
    date: '2027-02-06T09:00:00+02:00',
    startTime: '2027-02-06T09:00:00+02:00',
    endTime: '2027-02-06T17:00:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: null,
    capacity: 100,
    availableCapacity: 100,
    isFree: false,
    price: '999.99',
    status: EventStatus.REJECTED,
    rejectionReason: 'Misleading claims ("guaranteed profit") violate platform guidelines. Please revise the description.',
  },
  {
    id: '10000000-0000-4000-8000-000000000010',
    title: 'Open Mic Poetry Evening',
    description: 'An evening of spoken word, poetry and acoustic music.',
    category: 'Arts & Culture',
    venue: 'Bassline, Newtown, Johannesburg',
    date: '2027-02-14T19:00:00+02:00',
    startTime: '2027-02-14T19:00:00+02:00',
    endTime: '2027-02-14T22:00:00+02:00',
    eventType: EventType.IN_PERSON,
    meetingDetails: null,
    bannerImageUrl: 'https://picsum.photos/seed/poetry/1200/600',
    capacity: 150,
    availableCapacity: 97,
    isFree: true,
    price: null,
    status: EventStatus.REJECTED,
    rejectionReason: 'Missing venue confirmation. Please upload proof of booking and resubmit.',
  },
] satisfies Array<Omit<Prisma.EventUncheckedCreateInput, 'organizerId'>>;

async function main() {
  console.log('Seeding users...');

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    await prisma.user.upsert({
      where:  { email: u.email },
      update: { emailVerified: true },
      create: { firstname: u.firstname, lastname: u.lastname, email: u.email, passwordHash, role: u.role, emailVerified: true },
    });

    console.log(`  ✓ ${u.role} — ${u.email}`);
  }

  const organizer = await prisma.user.findUnique({
    where: { email: 'organizer@example.com' },
  });
  if (!organizer || organizer.role !== Role.ORGANIZER) {
    throw new Error('The seed organizer account is missing or does not have the ORGANIZER role.');
  }

  console.log('Seeding events...');
  for (const event of seedEvents) {
    const data: Prisma.EventUncheckedCreateInput = {
      ...event,
      date: new Date(event.date),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      organizerId: organizer.id,
    };

    await prisma.event.upsert({
      where: { id: event.id },
      update: data,
      create: data,
    });
    console.log(`  ✓ ${event.title}`);
  }

  await provisionInitialPlatformAdmin(prisma);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
