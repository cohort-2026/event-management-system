const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('ts-node/register/transpile-only');

const secret = 'notification-test-secret';
const attendeeId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const ownId = '00000000-0000-4000-8000-000000000003';
const otherNotificationId = '00000000-0000-4000-8000-000000000004';
let notifications;

const prisma = {
  user: {
    findUnique: async ({ where }) => ({
      id: where.id,
      role: 'ATTENDEE',
      isActive: true,
      mustChangePassword: false,
    }),
  },
  notification: {
    updateMany: async ({ where, data }) => {
      const matches = notifications.filter(item =>
        item.recipientId === where.recipientId &&
        item.readAt === null &&
        (!where.id || item.id === where.id));
      matches.forEach(item => Object.assign(item, data));
      return { count: matches.length };
    },
    findFirst: async ({ where }) =>
      notifications.find(item => item.id === where.id && item.recipientId === where.recipientId) ?? null,
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../lib/prisma') return { prisma };
  if (request === '../config/index') return { config: { jwtSecret: secret } };
  return originalLoad.call(this, request, parent, isMain);
};
const notificationRoutes = require('../src/routes/notificationRoutes').default;
Module._load = originalLoad;

const app = express();
app.use(express.json(), cookieParser());
app.use('/notifications', notificationRoutes);

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
  notifications = [
    { id: ownId, recipientId: attendeeId, readAt: null },
    { id: otherNotificationId, recipientId: otherId, readAt: null },
  ];
});

async function patch(path, userId = attendeeId) {
  const token = jwt.sign({ sub: userId, role: 'ATTENDEE' }, secret, { expiresIn: '1h' });
  return fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
}

test('attendees can mark their own notification as read, but not another recipient’s', async () => {
  assert.equal((await patch(`/notifications/${otherNotificationId}/read`)).status, 404);
  assert.equal(notifications[1].readAt, null);
  assert.equal((await patch(`/notifications/${ownId}/read`)).status, 200);
  assert.ok(notifications[0].readAt instanceof Date);
  assert.equal((await patch(`/notifications/${ownId}/read`)).status, 200);
});

test('mark all read is scoped to the attendee and requires authentication', async () => {
  assert.equal((await fetch(`${baseUrl}/notifications/read-all`, { method: 'PATCH' })).status, 401);
  assert.equal((await patch('/notifications/read-all')).status, 200);
  assert.ok(notifications[0].readAt instanceof Date);
  assert.equal(notifications[1].readAt, null);
});
