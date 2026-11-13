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
  emailService.sendEventChangeNotification = async () => {};
  emailService.sendEventCancellationNotification = async () => {};

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
    assert.equal(draftResponse.data.data.status, 'DRAFT', 'new events start as drafts');
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

    await prisma.user.update({
      where: { email: accounts.organizer.email },
      data: { profileApprovalStatus: ProfileApprovalStatus.PENDING_APPROVAL },
    });
    assert.equal((await request(`/api/events/${eventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 403, 'unapproved organizers cannot publish events');
    await prisma.user.update({
      where: { email: accounts.organizer.email },
      data: { profileApprovalStatus: ProfileApprovalStatus.APPROVED },
    });

    const published = await request(`/api/events/${eventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    });
    assert.equal(published.response.status, 200, 'approved organizer publishes without admin approval');
    const publicEvent = await request(`/api/events/${eventId}`);
    assert.equal(publicEvent.response.status, 200, 'published event is publicly visible');
    assert.equal(publicEvent.data.data.meetingDetails, undefined, 'public details omit meeting links');
    assert.equal(publicEvent.data.data.organizerId, undefined, 'public details omit internal organizer identifiers');
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
      cookie: accounts.otherOrganizer.cookie,
    })).response.status, 404, 'organizers cannot cancel another organizer event');
    assert.equal((await request(`/api/events/${eventId}/cancel`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200, 'organizer cancels their own event');
    assert.equal((await request(`/api/events/${eventId}`)).response.status, 404, 'cancelled events are not public');

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
    const ownerBookings = await request(`/api/events/${bookableEventId}/bookings?limit=1`, {
      cookie: accounts.organizer.cookie,
    });
    assert.equal(ownerBookings.response.status, 200);
    assert.equal(ownerBookings.data.data.length, 1);
    assert.equal(ownerBookings.data.pagination.total, 1);
    assert.equal((await request(`/api/events/${bookableEventId}/bookings`, {
      cookie: accounts.otherOrganizer.cookie,
    })).response.status, 404, 'organizers cannot view another organizer event bookings');

    const vendor = await prisma.user.findUnique({ where: { email: accounts.vendor.email } });
    await prisma.vendorApplication.create({
      data: {
        companyName: 'Phase 1 Vendor',
        registrationNumber: '2026/123456/07',
        description: 'Vendor application for event access testing.',
        requestedStandType: 'Food',
        requestedStandSize: 'Small',
        standDescription: 'One demonstration stand.',
        eventId: bookableEventId,
        vendorId: vendor.id,
      },
    });
    assert.equal((await request(`/api/events/${bookableEventId}/vendors`, {
      cookie: accounts.organizer.cookie,
    })).response.status, 200);
    assert.equal((await request(`/api/events/${bookableEventId}/vendors`, {
      cookie: accounts.otherOrganizer.cookie,
    })).response.status, 404, 'vendor applications are restricted to the event owner');

    const increasedCapacity = await request(`/api/events/${bookableEventId}`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
      body: { capacity: 12, ticketTypes: [{ name: 'General', price: 0, quantity: 12 }] },
    });
    assert.equal(increasedCapacity.response.status, 200, 'PATCH accepts an editable partial update');
    assert.equal(increasedCapacity.data.data.ticketTypes[0].id, freeTicketTypeId, 'ticket type identity is preserved');
    assert.equal(increasedCapacity.data.data.ticketTypes[0].availableQuantity, 11, 'issued quantity is preserved');
    const storedBookingAfterUpdate = await prisma.booking.findUnique({ where: { id: booking.data.data.id } });
    assert.equal(storedBookingAfterUpdate.eventTicketTypeId, freeTicketTypeId);
    assert.ok(await prisma.ticket.findUnique({ where: { id: ticketId } }));

    assert.equal((await request(`/api/events/${bookableEventId}`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
      body: { organizerId: vendor.id },
    })).response.status, 400, 'protected ownership fields cannot be mass-assigned');
    assert.equal((await request(`/api/events/${bookableEventId}`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
      body: { ticketTypes: [{ name: 'General', price: 1, quantity: 12 }] },
    })).response.status, 409, 'ticket prices with booking history cannot be changed');

    await prisma.event.update({
      where: { id: bookableEventId },
      data: { status: 'DRAFT' },
    });
    assert.equal((await request(`/api/events/${bookableEventId}`, {
      method: 'DELETE',
      cookie: accounts.organizer.cookie,
    })).response.status, 409, 'events with booking or ticket history cannot be deleted');
    await prisma.event.update({
      where: { id: bookableEventId },
      data: { status: 'PUBLISHED' },
    });

    const onlineInput = eventInput('Private Meeting Link Event');
    onlineInput.eventType = 'ONLINE';
    onlineInput.venue = 'Online';
    onlineInput.meetingDetails = 'https://meeting.example.test/secret-room';
    const onlineDraft = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: onlineInput,
    });
    const onlineEventId = onlineDraft.data.data.id;
    assert.equal((await request(`/api/events/${onlineEventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200);
    const onlinePublicEvent = await request(`/api/events/${onlineEventId}`);
    assert.equal(onlinePublicEvent.response.status, 200);
    assert.equal(onlinePublicEvent.data.data.meetingDetails, undefined);
    assert.doesNotMatch(JSON.stringify(onlinePublicEvent.data), /secret-room/);

    const startDate = new Date(onlinePublicEvent.data.data.startTime).toISOString().slice(0, 10);
    const filteredEvents = await request(
      `/api/events?search=Private%20Meeting&category=Workshop&location=Online&startDate=${startDate}&endDate=${startDate}&page=1&limit=1`,
    );
    assert.equal(filteredEvents.response.status, 200);
    assert.equal(filteredEvents.data.data.length, 1);
    assert.equal(filteredEvents.data.data[0].id, onlineEventId);
    assert.equal(filteredEvents.data.pagination.total, 1);
    const firstPage = await request('/api/events?limit=1');
    assert.equal(firstPage.data.data.length, 1);
    assert.equal(firstPage.data.pagination.total >= 2, true);
    const publicEvents = await request('/api/events');
    assert.equal(publicEvents.data.data.some(event => event.id === eventId), false, 'cancelled events are excluded from public lists');
    const listedOnlineEvent = publicEvents.data.data.find(event => event.id === onlineEventId);
    assert.equal(listedOnlineEvent.meetingDetails, undefined, 'public listings omit meeting links');
    assert.equal(listedOnlineEvent.organizerId, undefined, 'public listings omit organizer identifiers');

    const myEvents = await request('/api/events/my?limit=1', { cookie: accounts.organizer.cookie });
    assert.equal(myEvents.response.status, 200);
    assert.equal(myEvents.data.data.length, 1);
    assert.equal(myEvents.data.pagination.total >= 3, true);

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
