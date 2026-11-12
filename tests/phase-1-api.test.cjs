const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { randomUUID } = require('node:crypto');

const backend = path.join(__dirname, '..', 'backend');
const testDatabaseUrl = process.env.PHASE1_TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  test('Phase 1 API workflows require PHASE1_TEST_DATABASE_URL', { skip: true }, () => {});
} else {
  const parsedDatabaseUrl = new URL(testDatabaseUrl);
  const safeHosts = ['localhost', '127.0.0.1', '::1'];
  if (!safeHosts.includes(parsedDatabaseUrl.hostname) ||
    !parsedDatabaseUrl.pathname.includes('phase1_test_')) {
    throw new Error('Refusing to run API integration tests unless the database is a loopback phase1_test database');
  }

  require(path.join(backend, 'node_modules', 'dotenv')).config({
    path: path.join(backend, '.env'),
    quiet: true,
  });
  process.env.DATABASE_URL = testDatabaseUrl;

  const { PrismaClient, Role, ProfileApprovalStatus, VendorProfileStatus } = require(path.join(backend, 'node_modules', '@prisma', 'client'));
  const bcrypt = require(path.join(backend, 'node_modules', 'bcryptjs'));
  const emailService = require(path.join(backend, 'dist', 'services', 'emailService.js'));
  const verificationCodes = new Map();
  emailService.sendVerificationCode = async (email, code) => verificationCodes.set(email, code);

  const app = require(path.join(backend, 'dist', 'app.js')).default;
  const prisma = new PrismaClient();
  const password = 'Test!Password2026';
  const unique = randomUUID();
  const accounts = {};
  let server;
  let apiBase;
  let adminCookie;

  async function request(url, { method = 'GET', cookie, body } = {}) {
    const response = await fetch(`${apiBase}${url}`, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    return {
      response,
      data: text ? JSON.parse(text) : null,
      cookie: response.headers.get('set-cookie')?.match(/auth_token=([^;]+)/)?.[1],
    };
  }

  async function registerAndLogin(role, key) {
    const email = `phase1-${key}-${unique}@example.test`;
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { firstname: key, lastname: 'Test', email, password, role },
    });
    assert.equal(registration.response.status, 201, `${role} registration`);

    const code = verificationCodes.get(email);
    assert.ok(code, `${role} verification code was captured by the test mail stub`);
    const verification = await request('/api/auth/verify-email', {
      method: 'POST',
      body: { email, code },
    });
    assert.equal(verification.response.status, 200, `${role} email verification`);

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    assert.equal(login.response.status, 200, `${role} login`);
    assert.ok(login.cookie, `${role} login sets the authentication cookie`);
    accounts[key] = { email, cookie: `auth_token=${login.cookie}` };
    return accounts[key];
  }

  async function submitOrganizerProfile(cookie, key) {
    const result = await request('/api/organizer/profile', {
      method: 'PUT',
      cookie,
      body: {
        firstname: key,
        lastname: 'Test',
        organizationName: `Organization ${key}`,
        organizationEmail: `${key}@organization.test`,
        organizationRegistrationNumber: '123456789',
        phone: '+27821234567',
      },
    });
    assert.equal(result.response.status, 200, `${key} organizer profile submission`);
    assert.equal(result.data.data.profileApprovalStatus, ProfileApprovalStatus.PENDING_APPROVAL);
  }

  async function submitVendorProfile(cookie, key) {
    const result = await request('/api/vendors/profile', {
      method: 'PUT',
      cookie,
      body: {
        businessName: `Business ${key}`,
        businessDescription: 'A test business profile for event participation.',
        businessRegistrationNumber: '2020/123456/07',
        contactPerson: key,
        contactEmail: `${key}@vendor.test`,
        contactPhone: '+27821234567',
        productsServices: ['Food'],
        supportingDocumentUrls: [],
        submitForReview: true,
      },
    });
    assert.equal(result.response.status, 200, `${key} vendor profile submission`);
    assert.equal(result.data.data.status, VendorProfileStatus.PENDING_REVIEW);
    return result.data.data.id;
  }

  function eventInput(title) {
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    return {
      title,
      description: 'Integration test event description with enough detail.',
      category: 'Workshop',
      venue: 'Test Hall',
      eventType: 'IN_PERSON',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      capacity: 10,
      vendorStandsAvailable: 0,
      vendorStandRatePerSqm: 0,
      ticketTypes: [{ name: 'General', price: 0, quantity: 10 }],
    };
  }

  test('live auth, approval, role authorization, event, booking and ownership workflows', async () => {
    const adminHash = await bcrypt.hash(password, 4);
    const admin = await prisma.user.create({
      data: {
        firstname: 'Phase1',
        lastname: 'Admin',
        email: `phase1-admin-${unique}@example.test`,
        passwordHash: adminHash,
        role: Role.ADMIN,
        emailVerified: true,
      },
    });

    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    apiBase = `http://127.0.0.1:${server.address().port}`;

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: admin.email, password },
    });
    assert.equal(adminLogin.response.status, 200, 'Admin login');
    adminCookie = `auth_token=${adminLogin.cookie}`;

    for (const [role, key] of [
      ['ATTENDEE', 'attendee'],
      ['ATTENDEE', 'otherAttendee'],
      ['ORGANIZER', 'organizer'],
      ['ORGANIZER', 'rejectedOrganizer'],
      ['ORGANIZER', 'otherOrganizer'],
      ['VENDOR', 'vendor'],
      ['VENDOR', 'rejectedVendor'],
    ]) {
      await registerAndLogin(role, key);
    }

    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: accounts.attendee.email, password: 'Invalid!Password2026' },
    });
    assert.equal(badLogin.response.status, 401, 'invalid credentials are rejected');

    const publicAdminRegistration = await request('/api/auth/register', {
      method: 'POST',
      body: {
        firstname: 'Public',
        lastname: 'Admin',
        email: `phase1-public-admin-${unique}@example.test`,
        password,
        role: 'ADMIN',
      },
    });
    assert.equal(publicAdminRegistration.response.status, 400, 'public Admin registration is rejected');

    const unauthenticated = await request('/api/users/organizers');
    assert.equal(unauthenticated.response.status, 401, 'protected endpoints reject unauthenticated requests');
    assert.equal((await request('/api/users/organizers', { cookie: accounts.attendee.cookie })).response.status, 403);
    assert.equal((await request('/api/events/mine', { cookie: accounts.vendor.cookie })).response.status, 403);
    assert.equal((await request('/api/platform-admin/admins', { cookie: accounts.organizer.cookie })).response.status, 403);

    const organizerEventInput = eventInput('Pending organizer event');
    assert.equal((await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: organizerEventInput,
    })).response.status, 403, 'pending organizers cannot create events');

    await submitOrganizerProfile(accounts.organizer.cookie, 'organizer');
    await submitOrganizerProfile(accounts.rejectedOrganizer.cookie, 'rejectedOrganizer');
    await submitOrganizerProfile(accounts.otherOrganizer.cookie, 'otherOrganizer');
    const profileList = await request('/api/users/organizers', { cookie: adminCookie });
    assert.equal(profileList.response.status, 200);

    const approvedOrganizer = profileList.data.data.find(user => user.email === accounts.organizer.email);
    const rejectedOrganizer = profileList.data.data.find(user => user.email === accounts.rejectedOrganizer.email);
    const otherOrganizer = profileList.data.data.find(user => user.email === accounts.otherOrganizer.email);
    assert.ok(approvedOrganizer && rejectedOrganizer && otherOrganizer);

    assert.equal((await request(`/api/users/organizers/${approvedOrganizer.id}/approve-profile`, {
      method: 'PATCH',
      cookie: adminCookie,
    })).response.status, 200);
    assert.equal((await request(`/api/users/organizers/${rejectedOrganizer.id}/reject-profile`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { reason: 'Please provide clearer organization records.' },
    })).response.status, 200);
    assert.equal((await request(`/api/users/organizers/${otherOrganizer.id}/approve-profile`, {
      method: 'PATCH',
      cookie: adminCookie,
    })).response.status, 200);

    const vendorProfileId = await submitVendorProfile(accounts.vendor.cookie, 'vendor');
    const rejectedVendorProfileId = await submitVendorProfile(accounts.rejectedVendor.cookie, 'rejectedVendor');
    assert.equal((await request('/api/vendors/me', { cookie: accounts.vendor.cookie })).response.status, 403);
    assert.equal((await request(`/api/vendors/admin/profiles/${vendorProfileId}/approve`, {
      method: 'PATCH',
      cookie: accounts.attendee.cookie,
    })).response.status, 403, 'non-admin users cannot approve vendor profiles');
    assert.equal((await request(`/api/vendors/admin/profiles/${vendorProfileId}/approve`, {
      method: 'PATCH',
      cookie: adminCookie,
    })).response.status, 200);
    assert.equal((await request(`/api/vendors/admin/profiles/${rejectedVendorProfileId}/reject`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { reason: 'Please provide valid supporting documents.' },
    })).response.status, 200);
    assert.equal((await request('/api/vendors/me', { cookie: accounts.vendor.cookie })).response.status, 200);

    const draftResponse = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: eventInput('Phase 1 Integration Event'),
    });
    assert.equal(draftResponse.response.status, 201, 'approved organizer creates a draft');
    const eventId = draftResponse.data.data.id;
    const ticketTypeId = draftResponse.data.data.ticketTypes[0].id;
    assert.equal((await request(`/api/events/${eventId}`)).response.status, 404, 'public users cannot view drafts');

    const updatedEvent = await request(`/api/events/${eventId}`, {
      method: 'PUT',
      cookie: accounts.organizer.cookie,
      body: eventInput('Updated Phase 1 Integration Event'),
    });
    assert.equal(updatedEvent.response.status, 200, 'organizer edits their own event');

    assert.equal((await request(`/api/events/${eventId}`, {
      method: 'PUT',
      cookie: accounts.otherOrganizer.cookie,
      body: eventInput('Unauthorized edit'),
    })).response.status, 404, 'organizers cannot edit another organizer event');

    const published = await request(`/api/events/${eventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    });
    assert.equal(published.response.status, 200, 'approved organizer publishes without admin approval');
    assert.equal((await request(`/api/events/${eventId}`)).response.status, 200, 'published event is publicly visible');
    assert.equal((await request(`/api/events/${eventId}/publish`, {
      method: 'PATCH',
      cookie: adminCookie,
    })).response.status, 403, 'Admin cannot publish an organizer event');
    assert.equal((await request(`/api/events/${eventId}/approve`, {
      method: 'PATCH',
      cookie: adminCookie,
    })).response.status, 404, 'event approval endpoint does not exist');
    assert.equal((await request(`/api/events/${eventId}/cancel`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200, 'organizer cancels their own event');

    const freeEvent = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: eventInput('Phase 1 Free Booking Event'),
    });
    const bookableEventId = freeEvent.data.data.id;
    const freeTicketTypeId = freeEvent.data.data.ticketTypes[0].id;
    assert.equal((await request(`/api/events/${bookableEventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200);

    const booking = await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: bookableEventId, ticketType: freeTicketTypeId },
    });
    assert.equal(booking.response.status, 201, 'attendee books a free published event');
    assert.equal(booking.data.data.eventTicketTypeId, freeTicketTypeId);
    const ticketId = booking.data.data.ticket.id;

    assert.equal((await request('/api/tickets/me', { cookie: accounts.attendee.cookie })).response.status, 200);
    assert.equal((await request(`/api/tickets/${ticketId}`, { cookie: accounts.otherAttendee.cookie })).response.status, 404);
    assert.equal((await request(`/api/bookings/${booking.data.data.id}/cancel`, {
      method: 'PATCH',
      cookie: accounts.otherAttendee.cookie,
    })).response.status, 404, 'attendees cannot cancel another user booking');
    assert.equal((await request(`/api/bookings/${booking.data.data.id}/cancel`, {
      method: 'PATCH',
      cookie: accounts.attendee.cookie,
    })).response.status, 200, 'attendee cancels their own booking');

    const draftToDelete = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: eventInput('Draft to delete'),
    });
    assert.equal((await request(`/api/events/${draftToDelete.data.data.id}`, {
      method: 'DELETE',
      cookie: accounts.organizer.cookie,
    })).response.status, 200, 'organizer deletes their own empty draft');

    assert.equal((await request('/api/reports/events', { cookie: adminCookie })).response.status, 200);
    assert.equal((await request('/api/reports/events', { cookie: accounts.organizer.cookie })).response.status, 403);

    const storedBooking = await prisma.booking.findUnique({ where: { id: booking.data.data.id } });
    assert.equal(storedBooking.status, 'CANCELLED');
  });

  test.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  });
}
