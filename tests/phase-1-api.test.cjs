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
    assert.equal((await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId, ticketTypeId, quantity: 1 },
    })).response.status, 404, 'attendees cannot book cancelled events');

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
      body: { eventId: bookableEventId, ticketTypeId: freeTicketTypeId, quantity: 2 },
    });
    assert.equal(booking.response.status, 201, 'attendee books a free published event');
    assert.equal(booking.data.data.eventTicketTypeId, freeTicketTypeId);
    assert.equal(booking.data.data.quantity, 2);
    assert.equal(booking.data.data.status, 'CONFIRMED');
    assert.equal(booking.data.data.paymentStatus, 'NOT_REQUIRED');
    assert.equal(booking.data.data.totalAmount, 0);
    assert.equal(booking.data.data.payment, null, 'free booking does not create a fake payment');
    assert.equal(booking.data.data.tickets.length, 2, 'free booking creates one ticket per quantity');
    assert.ok(booking.data.data.tickets.every(ticket => ticket.qrPayload));
    assert.equal(booking.data.data.ticket.id, booking.data.data.tickets[0].id, 'legacy singular ticket response is preserved');
    const ticketId = booking.data.data.ticket.id;
    assert.equal((await request(`/api/payments/${booking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { outcome: 'SUCCESS' },
    })).response.status, 409, 'free bookings cannot be processed as paid payments');

    const invalidQuantity = await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: bookableEventId, ticketTypeId: freeTicketTypeId, quantity: 0 },
    });
    assert.equal(invalidQuantity.response.status, 400, 'zero ticket quantities are rejected');
    assert.equal((await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: bookableEventId, ticketTypeId: freeTicketTypeId, quantity: 9 },
    })).response.status, 409, 'ticket quantities exceeding available capacity are rejected');
    assert.equal((await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: 'not-a-uuid', ticketTypeId: freeTicketTypeId },
    })).response.status, 400, 'invalid event UUIDs are rejected');
    assert.equal((await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: bookableEventId, ticketTypeId: 'not-a-uuid' },
    })).response.status, 400, 'invalid ticket type UUIDs are rejected');
    assert.equal((await request('/api/bookings/me?limit=0', {
      cookie: accounts.attendee.cookie,
    })).response.status, 400, 'invalid booking pagination is rejected');
    const myBookings = await request('/api/bookings/me?page=1&limit=1', {
      cookie: accounts.attendee.cookie,
    });
    assert.equal(myBookings.response.status, 200);
    assert.equal(myBookings.data.data.length, 1);
    assert.equal(myBookings.data.pagination.total, 1);
    assert.equal((await request('/api/bookings/me', {
      cookie: accounts.otherAttendee.cookie,
    })).data.data.length, 0, 'attendees can only list their own bookings');

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
    assert.equal(increasedCapacity.data.data.ticketTypes[0].availableQuantity, 10, 'quantity issued is preserved');
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
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'USED', checkedInAt: new Date() },
    });
    assert.equal((await request(`/api/bookings/${booking.data.data.id}/cancel`, {
      method: 'PATCH',
      cookie: accounts.attendee.cookie,
    })).response.status, 409, 'bookings with checked-in tickets cannot be cancelled');
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'ACTIVE', checkedInAt: null },
    });
    assert.equal((await request(`/api/bookings/${booking.data.data.id}/cancel`, {
      method: 'PATCH',
      cookie: accounts.attendee.cookie,
    })).response.status, 200, 'attendee cancels their own booking');
    const restoredFreeCapacity = await prisma.event.findUnique({ where: { id: bookableEventId } });
    assert.equal(restoredFreeCapacity.availableCapacity, 12, 'cancelling restores event capacity by booking quantity');
    const restoredTicketCapacity = await prisma.eventTicketType.findUnique({ where: { id: freeTicketTypeId } });
    assert.equal(restoredTicketCapacity.availableQuantity, 12, 'cancelling restores ticket type quantity');

    const paidEventInput = eventInput('Phase 1 Paid Booking Event');
    paidEventInput.ticketTypes[0].price = 25;
    const paidEvent = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: paidEventInput,
    });
    assert.equal(paidEvent.response.status, 201);
    const paidEventId = paidEvent.data.data.id;
    const paidTicketTypeId = paidEvent.data.data.ticketTypes[0].id;
    assert.equal((await request(`/api/events/${paidEventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200);
    assert.equal((await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: bookableEventId, ticketTypeId: paidTicketTypeId, quantity: 1 },
    })).response.status, 404, 'ticket types belonging to another event are rejected');
    const paidBooking = await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: paidEventId, ticketTypeId: paidTicketTypeId, quantity: 2 },
    });
    assert.equal(paidBooking.response.status, 201, 'paid booking is created for later payment processing');
    assert.equal(paidBooking.data.data.status, 'PENDING');
    assert.equal(paidBooking.data.data.paymentStatus, 'PENDING');
    assert.equal(paidBooking.data.data.totalAmount, 50, 'total is calculated using the server-side ticket price');
    assert.equal(paidBooking.data.data.tickets.length, 0, 'unpaid booking has no tickets');
    assert.equal(paidBooking.data.data.payment.status, 'PENDING');
    assert.equal(paidBooking.data.data.payment.amount, '50', 'pending payment amount matches booking total');
    const paidEventAfterBooking = await prisma.event.findUnique({ where: { id: paidEventId } });
    assert.equal(paidEventAfterBooking.availableCapacity, 10, 'pending paid bookings do not reserve capacity');
    const pendingPayment = await request(`/api/payments/${paidBooking.data.data.id}`, {
      cookie: accounts.attendee.cookie,
    });
    assert.equal(pendingPayment.response.status, 200);
    assert.equal(pendingPayment.data.data.payment.status, 'PENDING');
    assert.equal(pendingPayment.data.data.payment.simulated, true);
    assert.equal((await request(`/api/payments/${paidBooking.data.data.id}`, {
      cookie: accounts.otherAttendee.cookie,
    })).response.status, 404, 'attendees cannot view another attendee payment');
    assert.equal((await request(`/api/payments/${paidBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.otherAttendee.cookie,
      body: { outcome: 'SUCCESS' },
    })).response.status, 404, 'attendees cannot process another attendee payment');
    assert.equal((await request(`/api/payments/${paidBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { outcome: 'SUCCESS', cardNumber: 'not-collected' },
    })).response.status, 400, 'payment API rejects financial credential fields');
    assert.equal((await request('/api/payments/not-a-uuid', {
      cookie: accounts.attendee.cookie,
    })).response.status, 400, 'payment API validates booking UUIDs');

    const processedPayment = await request(`/api/payments/${paidBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { outcome: 'SUCCESS' },
    });
    assert.equal(processedPayment.response.status, 200, 'attendee processes their own simulated payment');
    assert.equal(processedPayment.data.data.booking.status, 'CONFIRMED');
    assert.equal(processedPayment.data.data.booking.paymentStatus, 'PAID');
    assert.equal(processedPayment.data.data.payment.status, 'PAID');
    assert.equal(processedPayment.data.data.tickets.length, 2, 'successful payment issues the booked quantity');
    assert.ok(processedPayment.data.data.tickets.every(ticket =>
      ticket.type === 'PAID' && ticket.qrPayload));
    const repeatedPayment = await request(`/api/payments/${paidBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { outcome: 'SUCCESS' },
    });
    assert.equal(repeatedPayment.response.status, 200);
    assert.equal(repeatedPayment.data.data.tickets.length, 2, 'repeated payment does not issue duplicate tickets');
    assert.equal((await prisma.event.findUnique({ where: { id: paidEventId } })).availableCapacity, 8,
      'repeated payment does not deduct capacity twice');
    assert.equal((await request('/api/payments/me?limit=1', {
      cookie: accounts.attendee.cookie,
    })).response.status, 200);
    assert.equal((await request(`/api/bookings/${paidBooking.data.data.id}/cancel`, {
      method: 'PATCH',
      cookie: accounts.attendee.cookie,
    })).response.status, 200);
    const successfulPaymentHistory = await prisma.payment.findUnique({
      where: { bookingId: paidBooking.data.data.id },
    });
    assert.equal(successfulPaymentHistory.status, 'PAID', 'cancelling preserves successful simulated payment history');
    assert.equal((await prisma.event.findUnique({ where: { id: paidEventId } })).availableCapacity, 10,
      'cancelling restores capacity after successful payment without claiming a refund');

    const failedBooking = await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.otherAttendee.cookie,
      body: { eventId: paidEventId, ticketTypeId: paidTicketTypeId, quantity: 1 },
    });
    assert.equal(failedBooking.response.status, 201);
    const failedPayment = await request(`/api/payments/${failedBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.otherAttendee.cookie,
      body: { outcome: 'FAILED' },
    });
    assert.equal(failedPayment.response.status, 200);
    assert.equal(failedPayment.data.data.booking.paymentStatus, 'FAILED');
    assert.equal(failedPayment.data.data.tickets.length, 0, 'failed payment does not issue tickets');
    assert.equal((await prisma.event.findUnique({ where: { id: paidEventId } })).availableCapacity, 10,
      'failed payment does not claim capacity');
    assert.equal((await request(`/api/payments/${failedBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.otherAttendee.cookie,
      body: { outcome: 'FAILED' },
    })).response.status, 200, 'repeated failed payment returns the existing result');
    assert.equal((await prisma.ticket.count({ where: { bookingId: failedBooking.data.data.id } })), 0);

    const cancelledPendingBooking = await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: paidEventId, ticketTypeId: paidTicketTypeId, quantity: 1 },
    });
    assert.equal(cancelledPendingBooking.response.status, 201);
    assert.equal((await request(`/api/bookings/${cancelledPendingBooking.data.data.id}/cancel`, {
      method: 'PATCH',
      cookie: accounts.attendee.cookie,
    })).response.status, 200);
    assert.equal((await prisma.payment.findUnique({
      where: { bookingId: cancelledPendingBooking.data.data.id },
    })).status, 'FAILED', 'cancelling a pending simulated payment closes it as failed');
    assert.equal((await request(`/api/payments/${cancelledPendingBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { outcome: 'SUCCESS' },
    })).response.status, 409, 'cancelled pending bookings cannot be paid');
    assert.equal((await prisma.ticket.count({ where: { bookingId: cancelledPendingBooking.data.data.id } })), 0);

    const cancelledPaidEventInput = eventInput('Phase 1 Cancelled Paid Event');
    cancelledPaidEventInput.ticketTypes[0].price = 15;
    const cancelledPaidEvent = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: cancelledPaidEventInput,
    });
    const cancelledPaidEventId = cancelledPaidEvent.data.data.id;
    const cancelledPaidTicketTypeId = cancelledPaidEvent.data.data.ticketTypes[0].id;
    assert.equal((await request(`/api/events/${cancelledPaidEventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200);
    const cancelledEventBooking = await request('/api/bookings', {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { eventId: cancelledPaidEventId, ticketTypeId: cancelledPaidTicketTypeId, quantity: 1 },
    });
    assert.equal(cancelledEventBooking.response.status, 201);
    assert.equal((await request(`/api/events/${cancelledPaidEventId}/cancel`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200);
    assert.equal((await request(`/api/payments/${cancelledEventBooking.data.data.id}/process`, {
      method: 'POST',
      cookie: accounts.attendee.cookie,
      body: { outcome: 'SUCCESS' },
    })).response.status, 409, 'payments for cancelled events are rejected');
    assert.equal((await prisma.payment.findUnique({
      where: { bookingId: cancelledEventBooking.data.data.id },
    })).status, 'FAILED');
    assert.equal((await prisma.ticket.count({ where: { bookingId: cancelledEventBooking.data.data.id } })), 0);

    const singleSeatInput = eventInput('Phase 1 Concurrent Booking Event');
    singleSeatInput.capacity = 1;
    singleSeatInput.ticketTypes[0].quantity = 1;
    singleSeatInput.ticketTypes[0].price = 10;
    const singleSeatEvent = await request('/api/events', {
      method: 'POST',
      cookie: accounts.organizer.cookie,
      body: singleSeatInput,
    });
    assert.equal(singleSeatEvent.response.status, 201);
    const singleSeatEventId = singleSeatEvent.data.data.id;
    const singleSeatTicketTypeId = singleSeatEvent.data.data.ticketTypes[0].id;
    assert.equal((await request(`/api/events/${singleSeatEventId}/publish`, {
      method: 'PATCH',
      cookie: accounts.organizer.cookie,
    })).response.status, 200);
    const concurrentBookings = await Promise.all([
      request('/api/bookings', {
        method: 'POST',
        cookie: accounts.attendee.cookie,
        body: { eventId: singleSeatEventId, ticketTypeId: singleSeatTicketTypeId, quantity: 1 },
      }),
      request('/api/bookings', {
        method: 'POST',
        cookie: accounts.otherAttendee.cookie,
        body: { eventId: singleSeatEventId, ticketTypeId: singleSeatTicketTypeId, quantity: 1 },
      }),
    ]);
    assert.deepEqual(concurrentBookings.map(result => result.response.status), [201, 201],
      'pending paid bookings do not reserve capacity');
    const concurrentPayments = await Promise.all(concurrentBookings.map((result, index) =>
      request(`/api/payments/${result.data.data.id}/process`, {
        method: 'POST',
        cookie: index === 0 ? accounts.attendee.cookie : accounts.otherAttendee.cookie,
        body: { outcome: 'SUCCESS' },
      })));
    assert.deepEqual(concurrentPayments.map(result => result.response.status).sort(), [200, 409],
      'concurrent simulated successes cannot oversell the final seat');
    const singleSeatAfterPayments = await prisma.event.findUnique({ where: { id: singleSeatEventId } });
    assert.equal(singleSeatAfterPayments.availableCapacity, 0);
    const concurrentBookingRecords = await Promise.all(concurrentBookings.map(result =>
      prisma.booking.findUnique({ where: { id: result.data.data.id } })));
    assert.deepEqual(concurrentBookingRecords.map(result => result.paymentStatus).sort(), ['FAILED', 'PAID']);
    assert.equal(await prisma.ticket.count({ where: { eventId: singleSeatEventId } }), 1,
      'only the successful payment gets a ticket');
    const successfulConcurrentIndex = concurrentBookingRecords.findIndex(record => record.paymentStatus === 'PAID');
    const repeatedConcurrentSuccess = await request(
      `/api/payments/${concurrentBookings[successfulConcurrentIndex].data.data.id}/process`,
      {
        method: 'POST',
        cookie: successfulConcurrentIndex === 0 ? accounts.attendee.cookie : accounts.otherAttendee.cookie,
        body: { outcome: 'SUCCESS' },
      },
    );
    assert.equal(repeatedConcurrentSuccess.response.status, 200);
    assert.equal((await prisma.event.findUnique({ where: { id: singleSeatEventId } })).availableCapacity, 0,
      'retry after a concurrent success does not deduct capacity again');

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
