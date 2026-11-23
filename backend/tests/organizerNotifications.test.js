const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('ts-node/register/transpile-only');

const realPrisma = require('@prisma/client');
const secret = 'test-secret';
const userIds = {
  organizer: '00000000-0000-4000-8000-000000000001',
  other: '00000000-0000-4000-8000-000000000002',
  vendor: '00000000-0000-4000-8000-000000000003',
  admin: '00000000-0000-4000-8000-000000000004',
  attendee: '00000000-0000-4000-8000-000000000005',
  event: '00000000-0000-4000-8000-000000000006',
};
let state;
let failNotification;

function client(getState) {
  return {
    user: {
      findUnique: async ({ where }) => getState().users.find(user => user.id === where.id) || null,
      findFirst: async ({ where }) => getState().users.find(user => user.id === where.id && user.role === where.role) || null,
      updateMany: async ({ where, data }) => {
        const user = getState().users.find(item => item.id === where.id && item.role === where.role && item.profileApprovalStatus === where.profileApprovalStatus);
        if (!user) return { count: 0 };
        Object.assign(user, data);
        return { count: 1 };
      },
    },
    vendorProfile: { findUnique: async () => ({ status: 'APPROVED', businessName: 'Vendor Co', businessRegistrationNumber: '123', businessDescription: 'Products', productsServices: [] }) },
    event: { findUnique: async ({ where }) => getState().events.find(event => event.id === where.id) || null },
    vendorApplication: {
      findFirst: async ({ where }) => getState().applications.find(item => item.vendorId === where.vendorId && item.eventId === where.eventId && item.status !== 'REJECTED') || null,
      create: async ({ data }) => {
        const application = { id: `application-${getState().applications.length + 1}`, ...data, status: 'PENDING_REVIEW' };
        getState().applications.push(application);
        return application;
      },
    },
    auditLog: { create: async ({ data }) => getState().audits.push(data) },
    notification: {
      create: async ({ data }) => {
        if (failNotification) throw new Error('notification insert failed');
        const notificationId = String(getState().notifications.length + 1).padStart(12, '0');
        const notification = { id: `00000000-0000-4000-8000-${notificationId}`, ...data, readAt: null, createdAt: new Date().toISOString() };
        getState().notifications.push(notification);
        return notification;
      },
      findMany: async ({ where }) => getState().notifications.filter(item => item.recipientId === where.recipientId),
      count: async ({ where }) => getState().notifications.filter(item => item.recipientId === where.recipientId && item.readAt === null).length,
      updateMany: async ({ where, data }) => {
        const matches = getState().notifications.filter(item => item.recipientId === where.recipientId && item.readAt === null && (!where.id || item.id === where.id));
        matches.forEach(item => Object.assign(item, data));
        return { count: matches.length };
      },
      findFirst: async ({ where }) => getState().notifications.find(item => item.id === where.id && item.recipientId === where.recipientId) || null,
    },
    $queryRaw: async () => [{ businessName: 'Vendor Co', businessRegistrationNumber: '123', businessDescription: 'Products', productsServices: [] }],
  };
}

class MockPrismaClient {
  constructor() {
    Object.assign(this, client(() => state));
  }
  async $transaction(callback) {
    const draft = structuredClone(state);
    const result = await callback(client(() => draft));
    state = draft;
    return result;
  }
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@prisma/client') return { ...realPrisma, PrismaClient: MockPrismaClient };
  if (request === '../config/index') return { config: { jwtSecret: secret, vendorDocumentsDir: '.' } };
  if (request === '../services/emailService') return { sendVendorApplicationSubmitted: async () => {} };
  return originalLoad.call(this, request, parent, isMain);
};
const vendorRoutes = require('../src/routes/vendorRoutes').default;
const notificationRoutes = require('../src/routes/notificationRoutes').default;
const { approveOrganizerProfile } = require('../src/controllers/organizerController');
const { requireAuth, requireRole } = require('../src/middleware/auth');
Module._load = originalLoad;

const app = express();
app.use(express.json(), cookieParser());
app.use('/vendors', vendorRoutes);
app.use('/notifications', notificationRoutes);
app.patch('/organizers/:id/approve', requireAuth, requireRole('ADMIN'), approveOrganizerProfile);
app.use((_error, _req, res, _next) => res.status(500).json({ success: false }));

let server;
let baseUrl;
test.before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
test.beforeEach(() => {
  failNotification = false;
  state = {
    users: [
      { id: userIds.organizer, role: 'ORGANIZER', isActive: true, mustChangePassword: false, firstname: 'Org', lastname: 'Owner', organizationName: 'Org', organizationEmail: 'org@example.test', organizationRegistrationNumber: '123456789', phone: '1234567890', profileApprovalStatus: 'PENDING_APPROVAL' },
      { id: userIds.other, role: 'ORGANIZER', isActive: true, mustChangePassword: false },
      { id: userIds.vendor, role: 'VENDOR', isActive: true, mustChangePassword: false },
      { id: userIds.admin, role: 'ADMIN', isActive: true, mustChangePassword: false },
      { id: userIds.attendee, role: 'ATTENDEE', isActive: true, mustChangePassword: false },
    ],
    events: [{ id: userIds.event, title: 'Market', organizerId: userIds.organizer, organizer: { id: userIds.organizer, firstname: 'Org', email: 'org@example.test' }, status: 'PUBLISHED', startTime: new Date('2100-01-01'), vendorStandsAvailable: 4, vendorStandRatePerSqm: 10, _count: { vendorApplications: 0 } }],
    applications: [],
    notifications: [],
    audits: [],
  };
});

async function request(path, userId, method = 'GET', body) {
  const role = userId === 'admin' ? 'ADMIN' : userId === 'organizer' || userId === 'other' ? 'ORGANIZER' : userId === 'vendor' ? 'VENDOR' : 'ATTENDEE';
  const token = jwt.sign({ sub: userIds[userId], role }, secret, { expiresIn: '1h' });
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

const application = { eventId: userIds.event, requestedStandType: 'Food', requestedStandSize: '3m x 3m', standDescription: 'A food stand with snacks' };

test('stand submissions notify only the event organizer, including resubmissions', async () => {
  const firstSubmission = await request('/vendors/apply', 'vendor', 'POST', application);
  assert.equal(firstSubmission.status, 201, JSON.stringify(firstSubmission.body));
  assert.equal((await request('/vendors/apply', 'vendor', 'POST', application)).status, 409);
  state.applications[0].status = 'REJECTED';
  assert.equal((await request('/vendors/apply', 'vendor', 'POST', application)).status, 201);
  const inbox = await request('/notifications', 'organizer');
  assert.equal(inbox.body.unreadCount, 2);
  assert.equal(inbox.body.data[0].link, `/organizer/events/${userIds.event}/vendors`);
  assert.match(inbox.body.data[0].message, /Vendor Co.*Market/);
  assert.equal((await request('/notifications', 'other')).body.unreadCount, 0);
});

test('profile approval notifies its organizer once and read operations are recipient-scoped', async () => {
  assert.equal((await request(`/organizers/${userIds.organizer}/approve`, 'admin', 'PATCH')).status, 200);
  assert.equal((await request(`/organizers/${userIds.organizer}/approve`, 'admin', 'PATCH')).status, 409);
  const inbox = await request('/notifications', 'organizer');
  assert.equal(inbox.body.unreadCount, 1);
  assert.equal(inbox.body.data[0].link, '/organizer/profile');
  const id = inbox.body.data[0].id;
  assert.equal((await request(`/notifications/${id}/read`, 'other', 'PATCH')).status, 404);
  assert.equal((await request('/notifications', 'attendee')).status, 200);
  assert.equal((await request('/notifications', 'attendee')).body.unreadCount, 0);
  assert.equal((await request(`/notifications/${id}/read`, 'organizer', 'PATCH')).status, 200);
  assert.equal((await request('/notifications', 'organizer')).body.unreadCount, 0);
  state.users[0].profileApprovalStatus = 'PENDING_APPROVAL';
  assert.equal((await request(`/organizers/${userIds.organizer}/approve`, 'admin', 'PATCH')).status, 200);
  assert.equal((await request('/notifications', 'organizer')).body.unreadCount, 1);
  assert.equal((await request('/notifications/read-all', 'other', 'PATCH')).status, 200);
  assert.equal((await request('/notifications', 'organizer')).body.unreadCount, 1);
  assert.equal((await request('/notifications/read-all', 'organizer', 'PATCH')).status, 200);
  assert.equal((await request('/notifications', 'organizer')).body.unreadCount, 0);
});

test('notification failures roll back submissions and approvals', async () => {
  failNotification = true;
  assert.equal((await request('/vendors/apply', 'vendor', 'POST', application)).status, 500);
  assert.equal(state.applications.length, 0);
  assert.equal((await request(`/organizers/${userIds.organizer}/approve`, 'admin', 'PATCH')).status, 500);
  assert.equal(state.users[0].profileApprovalStatus, 'PENDING_APPROVAL');
  assert.equal(state.audits.length, 0);
});
