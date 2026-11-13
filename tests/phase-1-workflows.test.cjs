const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const schema = read('backend', 'prisma', 'schema.prisma');
const roleMigration = read(
  'backend',
  'prisma',
  'migrations',
  '20261109000000_simplify_roles_and_event_statuses',
  'migration.sql',
);
const bookingMigration = read(
  'backend',
  'prisma',
  'migrations',
  '20261112100000_link_bookings_to_event_ticket_types',
  'migration.sql',
);
const bookingCapacityMigration = read(
  'backend',
  'prisma',
  'migrations',
  '20261113130000_booking_quantities_and_ticket_qr',
  'migration.sql',
);
const vendorProfileMigration = read(
  'backend',
  'prisma',
  'migrations',
  '20261113152000_add_vendor_profile_and_document_review_fields',
  'migration.sql',
);
const authController = read('backend', 'src', 'controllers', 'authController.ts');
const authRoutes = read('backend', 'src', 'routes', 'authRoutes.ts');
const authMiddleware = read('backend', 'src', 'middleware', 'auth.ts');
const eventRoutes = read('backend', 'src', 'routes', 'eventRoutes.ts');
const eventController = read('backend', 'src', 'controllers', 'eventController.ts');
const ticketRoutes = read('backend', 'src', 'routes', 'ticketRoutes.ts');
const ticketController = read('backend', 'src', 'controllers', 'ticketController.ts');
const ticketCheckInService = read('backend', 'src', 'services', 'ticketCheckInService.ts');
const paymentRoutes = read('backend', 'src', 'routes', 'paymentRoutes.ts');
const paymentController = read('backend', 'src', 'controllers', 'paymentController.ts');
const ticketService = read('backend', 'src', 'services', 'ticketService.ts');
const organizerRoutes = read('backend', 'src', 'routes', 'userRoutes.ts');
const vendorRoutes = read('backend', 'src', 'routes', 'vendorRoutes.ts');
const frontendRoles = read('frontend', 'src', 'types', 'user.ts');
const frontendRegistration = read('frontend', 'src', 'pages', 'auth', 'Register.tsx');
const frontendApp = read('frontend', 'src', 'App.tsx');
const protectedRoute = read('frontend', 'src', 'components', 'layout', 'ProtectedRoute.tsx');

function enumValues(source, name) {
  const match = source.match(new RegExp(`enum ${name}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Prisma enum ${name} is present`);
  return match[1].trim().split(/\s+/);
}

test('Prisma schema defines exactly four roles and four event lifecycle states', () => {
  assert.deepEqual(enumValues(schema, 'Role'), ['ATTENDEE', 'VENDOR', 'ORGANIZER', 'ADMIN']);
  assert.deepEqual(enumValues(schema, 'EventStatus'), ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']);
});

test('legacy-role migration remaps values and rebuilds enums without deleting records', () => {
  assert.match(roleMigration, /SET "role" = 'ADMIN'::"Role"[\s\S]*'PLATFORM_ADMIN'::"Role"[\s\S]*'MANAGEMENT'::"Role"/);
  assert.match(roleMigration, /SET "status" = 'DRAFT'::"EventStatus"[\s\S]*'PENDING_APPROVAL'::"EventStatus"[\s\S]*'REJECTED'::"EventStatus"/);
  assert.match(roleMigration, /ALTER TABLE "users"\s+ALTER COLUMN "role" TYPE "Role"/);
  assert.match(roleMigration, /ALTER TABLE "events"\s+ALTER COLUMN "status" TYPE "EventStatus"/);
  assert.doesNotMatch(roleMigration, /\b(DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i);
});

test('ticket-type link migration is additive and preserves existing bookings', () => {
  assert.match(bookingMigration, /ADD COLUMN "event_ticket_type_id" TEXT/);
  assert.match(bookingMigration, /FOREIGN KEY \("event_ticket_type_id"\) REFERENCES "event_ticket_types"\("id"\)/);
  assert.match(bookingMigration, /ON DELETE SET NULL/);
  assert.doesNotMatch(bookingMigration, /\b(DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i);
  assert.match(schema, /eventTicketTypeId\s+String\?\s+@map\("event_ticket_type_id"\)/);
});

test('booking capacity migration backfills records and permits multiple tickets per booking', () => {
  assert.match(schema, /reference\s+String\s+@unique/);
  assert.match(schema, /quantity\s+Int\s+@default\(1\)/);
  assert.match(schema, /totalAmount\s+Decimal[\s\S]*@map\("total_amount"\)/);
  assert.match(schema, /tickets\s+Ticket\[\]/);
  assert.match(schema, /qrPayload\s+String\s+@unique/);
  assert.match(bookingCapacityMigration, /UPDATE "bookings"[\s\S]*"quantity" = GREATEST/);
  assert.match(bookingCapacityMigration, /"total_amount" = COALESCE/);
  assert.match(bookingCapacityMigration, /UPDATE "tickets"[\s\S]*"qr_payload" = 'QR-' \|\| "reference_number"/);
  assert.match(bookingCapacityMigration, /DROP INDEX "tickets_booking_id_key"/);
  assert.doesNotMatch(bookingCapacityMigration, /\b(DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i);
});

test('simulated payment routes enforce attendee ownership and use transactional ticket issuance', () => {
  assert.match(paymentRoutes, /router\.post\([\s\S]*requireAuth[\s\S]*requireRole\('ATTENDEE'\)[\s\S]*processSimulatedPayment/);
  assert.match(paymentRoutes, /router\.get\('\/:bookingId'/);
  assert.match(paymentController, /body\.outcome !== 'SUCCESS' && body\.outcome !== 'FAILED'/);
  assert.match(paymentController, /Object\.keys\(body\)/);
  assert.match(paymentController, /FOR UPDATE/);
  assert.match(paymentController, /availableCapacity:\s*\{\s*gte:\s*booking\.quantity\s*\}/);
  assert.match(paymentController, /availableQuantity:\s*\{\s*gte:\s*booking\.quantity\s*\}/);
  assert.match(paymentController, /issueTicketsForBooking/);
  assert.match(ticketService, /existingCount > 0/);
  assert.match(ticketService, /transaction\.ticket\.createMany/);
  assert.match(paymentController, /providerReference:\s*'SIMULATED-SUCCESS'/);
  assert.doesNotMatch(paymentController, /cardNumber|cvv|bankingPassword/i);
});

test('public registration excludes Admin in both backend validation and frontend types', () => {
  const roles = authController.match(/REGISTRATION_ROLES\s*=\s*\[([^\]]+)\]/)?.[1] ?? '';
  assert.match(roles, /ATTENDEE[\s\S]*VENDOR[\s\S]*ORGANIZER/);
  assert.doesNotMatch(roles, /ADMIN/);
  assert.match(frontendRoles, /RegistrationRole\s*=\s*Extract<UserRole,\s*'ATTENDEE'\s*\|\s*'VENDOR'\s*\|\s*'ORGANIZER'>/);
  assert.match(frontendRoles, /role:\s*RegistrationRole/);
  assert.match(frontendRegistration, /role:\s*'' as RegistrationRole/);
  assert.match(authRoutes, /router\.post\('\/register',\s*(?:\w+,\s*)*register\)/);
});

test('login and protected requests use cookie JWT authentication and active database roles', () => {
  assert.match(authRoutes, /router\.post\('\/login',\s*(?:\w+,\s*)*login\)/);
  assert.match(authController, /bcrypt\.compare\(password,\s*passwordHash\)/);
  assert.match(authController, /jwt\.sign\([\s\S]*user\.role/);
  assert.match(authMiddleware, /if \(!token\)[\s\S]*res\.status\(401\)/);
  assert.match(authMiddleware, /jwt\.verify\(token,\s*config\.jwtSecret(?:,\s*\{[^}]*\})?\)/);
  assert.match(authMiddleware, /role:\s*user\.role/);
});

test('admin profile decisions are admin-only and unapproved profiles are restricted', () => {
  assert.match(organizerRoutes, /\/organizers\/:id\/approve-profile',\s+requireAuth,\s+requireRole\('ADMIN'\)/);
  assert.match(organizerRoutes, /\/organizers\/:id\/reject-profile',\s+requireAuth,\s+requireRole\('ADMIN'\)/);
  assert.match(vendorRoutes, /\/admin\/profiles\/:id\/approve',\s*requireAuth,\s*requireRole\('ADMIN'\)/);
  assert.match(vendorRoutes, /\/admin\/profiles\/:id\/reject',\s*requireAuth,\s*requireRole\('ADMIN'\)/);
  assert.match(authMiddleware, /profile\?\.status !== VendorProfileStatus\.APPROVED/);
  assert.match(authMiddleware, /Vendor profile approval is required/);
  assert.match(authMiddleware, /ProfileApprovalStatus\.APPROVED/);
});

test('vendor profiles, documents and applications use separate admin and organizer review workflows', () => {
  assert.match(schema, /enum VendorDocumentStatus\s*\{\s*PENDING_REVIEW\s+APPROVED\s+REJECTED/s);
  assert.match(vendorProfileMigration, /ADD COLUMN "business_type"/);
  assert.match(vendorProfileMigration, /ADD COLUMN "business_address"/);
  assert.doesNotMatch(vendorProfileMigration, /\b(DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i);
  assert.match(vendorRoutes, /router\.get\('\/me', requireAuth, requireRole\('VENDOR'\), getVendorProfile\)/);
  assert.match(vendorRoutes, /router\.get\('\/applications\/me'/);
  assert.match(vendorRoutes, /router\.get\('\/events'/);
  assert.match(vendorRoutes, /router\.get\('\/invoices'/);
  assert.match(vendorRoutes, /router\.patch\('\/staff\/:id'/);
  assert.match(vendorRoutes, /router\.delete\('\/staff\/:id'/);
  assert.match(vendorRoutes, /SELECT "id" FROM "events" WHERE "id" = \$\{application\.event\.id\} FOR UPDATE/);
  assert.match(vendorRoutes, /vendorProfile\?\.status !== VendorProfileStatus\.APPROVED/);
  assert.match(vendorRoutes, /data: \{ isActive: false \}/);
  assert.match(vendorRoutes, /Vendor access deactivated; profile and related records were preserved/);
  assert.match(eventController, /paginationMeta\(pagination, total\)/);
});

test('organizer event write routes require approved organizer role and ownership', () => {
  for (const route of [
    "router.post('/',",
    "router.put('/:id',",
    "router.patch('/:id/publish',",
    "router.patch('/:id/cancel',",
    "router.delete('/:id',",
  ]) {
    const line = eventRoutes.split('\n').find(entry => entry.includes(route));
    assert.ok(line, `Organizer route ${route} exists`);
    assert.match(line, /requireRole\('ORGANIZER'\),\s*requireApprovedOrganizerProfile/);
  }
  assert.match(eventController, /organizerId:\s*req\.user!\.id/);
  assert.match(eventController, /PUBLISHABLE_EVENT_STATUSES[\s\S]*EventStatus\.DRAFT/);
  assert.doesNotMatch(eventRoutes, /events\/:id\/(?:approve|reject)/);
});

test('public event list and detail queries expose published events only', () => {
  const list = eventController.slice(
    eventController.indexOf('export const listPublicEvents'),
    eventController.indexOf('export const getPublicEvent'),
  );
  const detail = eventController.slice(
    eventController.indexOf('export const getPublicEvent'),
    eventController.indexOf('export const getManagedEvent'),
  );
  assert.match(list, /const where: Prisma\.EventWhereInput\s*=\s*\{\s*status:\s*EventStatus\.PUBLISHED\s*\}/);
  assert.match(detail, /where:\s*\{\s*id:\s*eventId,\s*status:\s*EventStatus\.PUBLISHED\s*\}/);
  assert.match(list, /search/);
  assert.match(list, /paginationMeta/);
  assert.match(eventController, /meetingDetails:\s*_meetingDetails/);
});

test('ticket access, QR check-in and attendance routes enforce ownership and booking validity', () => {
  assert.match(ticketRoutes, /router\.get\('\/me',\s*requireAuth,\s*requireRole\('ATTENDEE'\)/);
  assert.match(ticketRoutes, /router\.get\('\/:id',\s*requireAuth,\s*requireRole\('ATTENDEE',\s*'ORGANIZER'\)/);
  assert.match(ticketRoutes, /router\.post\('\/scan',\s*requireAuth,\s*requireRole\('ORGANIZER'\),\s*requireApprovedOrganizerProfile,\s*scanTicketQr\)/);
  assert.match(ticketRoutes, /router\.patch\('\/:id\/checkin',\s*requireAuth,\s*requireRole\('ORGANIZER'\),\s*requireApprovedOrganizerProfile,\s*checkInTicket\)/);
  assert.match(ticketController, /where\s*=\s*\{\s*holderId:\s*req\.user!\.id\s*\}/);
  assert.match(ticketController, /ticket\?\.event\.organizerId\s*===\s*req\.user!\.id/);
  assert.match(ticketController, /isValidQrPayload/);
  assert.match(ticketCheckInService, /FOR UPDATE/);
  assert.match(ticketCheckInService, /BookingStatus\.CONFIRMED/);
  assert.match(ticketCheckInService, /PaymentStatus\.NOT_REQUIRED/);
  assert.match(ticketCheckInService, /PaymentStatus\.PAID/);
  assert.match(ticketCheckInService, /TicketStatus\.ACTIVE/);
  assert.match(eventRoutes, /router\.get\('\/:id\/attendance',\s*requireAuth,\s*requireRole\('ORGANIZER'\),\s*requireApprovedOrganizerProfile,\s*getEventAttendance\)/);
  assert.match(eventController, /totalConfirmedTickets[\s\S]*totalCheckedInTickets[\s\S]*totalNotYetCheckedInTickets/);
  assert.match(eventController, /payment:\s*\{\s*is:\s*\{\s*status:\s*PaymentStatus\.PAID\s*\}\s*\}/);
});

test('admin, organizer, vendor and attendee frontend routes are role-protected', () => {
  for (const role of ['ATTENDEE', 'VENDOR', 'ORGANIZER', 'ADMIN']) {
    assert.match(frontendApp, new RegExp(`roles=\\{\\['${role}'\\]\\}`));
    assert.match(frontendApp, new RegExp(`${role}:`));
    assert.match(protectedRoute, new RegExp(`${role}:`));
  }
  for (const dashboard of ['AdminDashboard', 'OrganizerDashboard', 'VendorDashboard', 'AttendeeDashboard']) {
    assert.match(frontendApp, new RegExp(`import ${dashboard}`));
  }
});

test('all route files have implemented handlers rather than 501 stubs', () => {
  const routeDirectory = path.join(root, 'backend', 'src', 'routes');
  for (const filename of fs.readdirSync(routeDirectory).filter(name => name.endsWith('.ts'))) {
    assert.doesNotMatch(read('backend', 'src', 'routes', filename), /sendStatus\(501\)/, `${filename} has no 501 handler`);
  }
});
