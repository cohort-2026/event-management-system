/**
 * Simulated payment workflow tests.
 *
 * These are integration tests that require a live PostgreSQL database.
 * Run from the backend directory after `npm run build` and with a valid DATABASE_URL.
 *
 * Usage:
 *   cd backend
 *   node --test tests/payment-workflow.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

// ── Environment ──────────────────────────────────────────────────────────────

const env = {
  NODE_ENV: 'test',
  PORT: '5099',
  CLIENT_URL: 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: 'payment-test-secret-32-bytes-long!!',
  JWT_EXPIRES_IN: '1h',
  MAIL_HOST: 'localhost',
  MAIL_PORT: '25',
  MAIL_USER: 'test',
  MAIL_PASSWORD: 'test',
  MAIL_FROM: 'test@example.com',
};

if (!env.DATABASE_URL) {
  console.warn('DATABASE_URL not set – payment workflow tests skipped');
  process.exit(0);
}

Object.assign(process.env, env);

// ── Imports (after env is set) ────────────────────────────────────────────────

const jwt = require('../backend/node_modules/jsonwebtoken');
const app = require('../backend/dist/app').default;
const { prisma, disconnectPrisma } = require('../backend/dist/lib/prisma');

// ── Helpers ───────────────────────────────────────────────────────────────────

let server;
let baseUrl;

const token = (userId, role = 'ATTENDEE') =>
  jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: '1h' });

const authHeaders = (userId, role = 'ATTENDEE') => ({
  'Content-Type': 'application/json',
  Cookie: `auth_token=${token(userId, role)}`,
  Origin: env.CLIENT_URL,
});

const post = (path, body, userId, role) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: authHeaders(userId, role),
    body: JSON.stringify(body),
  });

const get = (path, userId, role) =>
  fetch(`${baseUrl}${path}`, { headers: authHeaders(userId, role) });

// ── Test data ─────────────────────────────────────────────────────────────────

const { randomUUID } = require('node:crypto');

const makeUser = async (role = 'ATTENDEE') => {
  const bcrypt = require('../backend/node_modules/bcryptjs');
  return prisma.user.create({
    data: {
      id: randomUUID(),
      firstname: 'Test',
      lastname: 'User',
      email: `test-${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('Password1!', 10),
      role,
      isActive: true,
      emailVerified: true,
      profileApprovalStatus: role === 'ORGANIZER' ? 'APPROVED' : 'PENDING_APPROVAL',
    },
  });
};

const makeEvent = async (organizerId, { isFree = false, capacity = 50 } = {}) => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const end = new Date(future.getTime() + 2 * 60 * 60 * 1000);
  return prisma.event.create({
    data: {
      title: `Test Event ${randomUUID().slice(0, 8)}`,
      description: 'Test',
      category: 'Workshop',
      venue: 'Test Venue',
      date: future,
      startTime: future,
      endTime: end,
      capacity,
      availableCapacity: capacity,
      isFree,
      status: 'PUBLISHED',
      organizerId,
    },
  });
};

const makeTicketType = async (eventId, { price = '100.00', quantity = 20 } = {}) =>
  prisma.eventTicketType.create({
    data: {
      name: 'General',
      price,
      quantity,
      availableQuantity: quantity,
      eventId,
    },
  });

// ── Lifecycle ─────────────────────────────────────────────────────────────────

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await disconnectPrisma();
});

// ── 1. Creating a paid booking ────────────────────────────────────────────────

test('1. Creating a paid booking sets provider SIMULATED and status PENDING', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const response = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'PENDING');
  assert.equal(body.data.paymentStatus, 'PENDING');
  assert.equal(body.data.payment.provider, 'SIMULATED');
  assert.equal(body.data.payment.status, 'PENDING');
  assert.equal(body.data.tickets.length, 0);
});

// ── 2. Creating a free booking ────────────────────────────────────────────────

test('2. Creating a free booking confirms immediately and issues tickets', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id, { isFree: true });
  const ticketType = await makeTicketType(event.id, { price: '0.00' });

  const response = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 2,
  }, attendee.id);

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.data.status, 'CONFIRMED');
  assert.equal(body.data.paymentStatus, 'NOT_REQUIRED');
  assert.equal(body.data.tickets.length, 2);
  assert.ok(!body.data.payment);
});

// ── 3. Successful simulated payment ──────────────────────────────────────────

test('3. Successful simulated payment confirms booking and issues tickets', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 2,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  const payRes = await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id);
  assert.equal(payRes.status, 200);
  const body = await payRes.json();
  assert.equal(body.success, true);
  assert.equal(body.data.booking.status, 'CONFIRMED');
  assert.equal(body.data.booking.paymentStatus, 'PAID');
  assert.equal(body.data.payment.status, 'PAID');
  assert.equal(body.data.payment.simulated, true);
  assert.equal(body.data.tickets.length, 2);
  assert.equal(new Set(body.data.tickets.map(ticket => ticket.referenceNumber)).size, 2);
  body.data.tickets.forEach(ticket => {
    assert.ok(ticket.referenceNumber.startsWith('EVT-'));
    assert.equal(ticket.qrPayload, undefined, 'payment response does not expose QR payloads');
  });
  const ticketDetails = await Promise.all(body.data.tickets.map(ticket => get(`/api/tickets/${ticket.id}`, attendee.id)));
  for (const response of ticketDetails) {
    assert.equal(response.status, 200);
    assert.ok((await response.json()).data.qrPayload.startsWith('QR-'));
  }

  // Capacity must be decremented
  const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
  assert.equal(updatedEvent.availableCapacity, event.capacity - 2);
});

// ── 4. Failed simulated payment ───────────────────────────────────────────────

test('4. Failed simulated payment marks payment FAILED and issues no tickets', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  const payRes = await post(`/api/payments/${bookingId}/process`, { outcome: 'FAILED' }, attendee.id);
  assert.equal(payRes.status, 200);
  const body = await payRes.json();
  assert.equal(body.data.booking.paymentStatus, 'FAILED');
  assert.equal(body.data.payment.status, 'FAILED');
  assert.equal(body.data.tickets.length, 0);

  // Capacity must NOT be decremented
  const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
  assert.equal(updatedEvent.availableCapacity, event.capacity);
});

// ── 5. Payment by another attendee ───────────────────────────────────────────

test('5. Another attendee cannot process a payment for a booking they do not own', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const other = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  const payRes = await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, other.id);
  assert.equal(payRes.status, 404);
});

// ── 6. Invalid payment outcome ────────────────────────────────────────────────

test('6. Invalid outcome is rejected with 400', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  const payRes = await post(`/api/payments/${bookingId}/process`, { outcome: 'PENDING' }, attendee.id);
  assert.equal(payRes.status, 400);

  const extraFieldRes = await post(`/api/payments/${bookingId}/process`, {
    outcome: 'SUCCESS',
    cardNumber: '4111111111111111',
  }, attendee.id);
  assert.equal(extraFieldRes.status, 400);
});

// ── 7. Payment processing for a non-pending booking ──────────────────────────

test('7. Processing payment for an already-confirmed booking returns 409', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  // Confirm it
  await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id);

  // Try to process again with FAILED
  const payRes = await post(`/api/payments/${bookingId}/process`, { outcome: 'FAILED' }, attendee.id);
  assert.equal(payRes.status, 409);
});

// ── 8. Duplicate successful processing ───────────────────────────────────────

test('8. Duplicate SUCCESS request returns the existing confirmed result idempotently', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id);
  const second = await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id);
  assert.equal(second.status, 200);
  const body = await second.json();
  assert.equal(body.success, true);
  assert.equal(body.data.booking.status, 'CONFIRMED');

  // Capacity must only be decremented once
  const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
  assert.equal(updatedEvent.availableCapacity, event.capacity - 1);

  // Tickets must not be duplicated
  const tickets = await prisma.ticket.findMany({ where: { bookingId } });
  assert.equal(tickets.length, 1);
});

// ── 9. Capacity unavailable before payment ────────────────────────────────────

test('9. Payment fails gracefully when capacity is exhausted before processing', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  // Create event with capacity 1
  const event = await makeEvent(organizer.id, { capacity: 1 });
  const ticketType = await makeTicketType(event.id, { quantity: 1 });

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  // Manually exhaust capacity to simulate race condition
  await prisma.event.update({
    where: { id: event.id },
    data: { availableCapacity: 0 },
  });
  await prisma.eventTicketType.update({
    where: { id: ticketType.id },
    data: { availableQuantity: 0 },
  });

  const payRes = await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id);
  assert.equal(payRes.status, 409);
  const body = await payRes.json();
  assert.equal(body.success, false);
  assert.match(body.message, /capacity/i);

  // Booking payment should be marked FAILED
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  assert.equal(booking.paymentStatus, 'FAILED');

  // No tickets issued
  const tickets = await prisma.ticket.findMany({ where: { bookingId } });
  assert.equal(tickets.length, 0);
});

// ── 10. Correct ticket quantity after successful payment ──────────────────────

test('10. Correct number of tickets are generated after successful payment', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id, { capacity: 10 });
  const ticketType = await makeTicketType(event.id, { quantity: 10 });

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 3,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  await post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id);

  const tickets = await prisma.ticket.findMany({ where: { bookingId } });
  assert.equal(tickets.length, 3);

  // Each ticket must have a unique reference and QR payload
  const refs = new Set(tickets.map(t => t.referenceNumber));
  const qrs = new Set(tickets.map(t => t.qrPayload));
  assert.equal(refs.size, 3);
  assert.equal(qrs.size, 3);
});

// ── 11. No tickets after failed payment ──────────────────────────────────────

test('11. No tickets are issued after a failed payment', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id);
  const ticketType = await makeTicketType(event.id);

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 2,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  await post(`/api/payments/${bookingId}/process`, { outcome: 'FAILED' }, attendee.id);

  const tickets = await prisma.ticket.findMany({ where: { bookingId } });
  assert.equal(tickets.length, 0);
});

// ── 12. No capacity reduction after failed payment ───────────────────────────

test('12. Capacity is not reduced after a failed payment', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id, { capacity: 10 });
  const ticketType = await makeTicketType(event.id, { quantity: 10 });

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 3,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  await post(`/api/payments/${bookingId}/process`, { outcome: 'FAILED' }, attendee.id);

  const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
  const updatedTicketType = await prisma.eventTicketType.findUnique({ where: { id: ticketType.id } });
  assert.equal(updatedEvent.availableCapacity, 10);
  assert.equal(updatedTicketType.availableQuantity, 10);
});

// ── 13. Concurrent payment processing ────────────────────────────────────────

test('13. Concurrent payment requests do not double-confirm or double-issue tickets', async () => {
  const organizer = await makeUser('ORGANIZER');
  const attendee = await makeUser('ATTENDEE');
  const event = await makeEvent(organizer.id, { capacity: 10 });
  const ticketType = await makeTicketType(event.id, { quantity: 10 });

  const bookingRes = await post('/api/bookings', {
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: 1,
  }, attendee.id);
  const { id: bookingId } = (await bookingRes.json()).data;

  // Fire two concurrent SUCCESS requests
  const [res1, res2] = await Promise.all([
    post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id),
    post(`/api/payments/${bookingId}/process`, { outcome: 'SUCCESS' }, attendee.id),
  ]);

  const statuses = [res1.status, res2.status];
  // At least one must succeed; the other may succeed (idempotent) or conflict
  assert.ok(statuses.includes(200), `Expected at least one 200, got ${statuses}`);

  // Exactly one ticket must exist
  const tickets = await prisma.ticket.findMany({ where: { bookingId } });
  assert.equal(tickets.length, 1);

  // Capacity decremented exactly once
  const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
  assert.equal(updatedEvent.availableCapacity, 9);
});
