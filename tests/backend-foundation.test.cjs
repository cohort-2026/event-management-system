const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('../backend/node_modules/express');
const { Prisma } = require('../backend/node_modules/@prisma/client');
const app = require('../backend/dist/app').default;
const { disconnectPrisma } = require('../backend/dist/lib/prisma');
const { requireRole } = require('../backend/dist/middleware/auth');
const { errorHandler } = require('../backend/dist/middleware/errorHandler');

let server;
let baseUrl;

test.before(async () => {
  app.get('/_foundation/role-check', (req, _res, next) => {
    req.user = { id: '00000000-0000-4000-8000-000000000001', role: 'ATTENDEE' };
    next();
  }, requireRole('ADMIN'), (_req, res) => res.sendStatus(204));

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  await disconnectPrisma();
});

const request = (path, options) => fetch(`${baseUrl}${path}`, options);

test('authentication rejects missing and invalid cookie tokens', async () => {
  const missing = await request('/api/auth/me');
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).success, false);

  const invalid = await request('/api/auth/me', { headers: { Cookie: 'auth_token=invalid.token' } });
  assert.equal(invalid.status, 401);
});

test('role authorization denies a user with the wrong active role', async () => {
  const response = await request('/_foundation/role-check');
  assert.equal(response.status, 403);
});

test('central error handling returns a safe duplicate-record response', async () => {
  const errorApp = express();
  errorApp.get('/duplicate', (_req, _res, next) => {
    next(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '5.22.0',
    }));
  });
  errorApp.use(errorHandler);
  const errorServer = errorApp.listen(0, '127.0.0.1');
  await once(errorServer, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${errorServer.address().port}/duplicate`);
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.deepEqual(body.errors, []);
  } finally {
    await new Promise(resolve => errorServer.close(resolve));
  }
});

test('request validation rejects malformed JSON, UUIDs, and pagination', async () => {
  const malformedJson = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid',
  });
  assert.equal(malformedJson.status, 400);

  const invalidId = await request('/api/events/not-a-uuid');
  assert.equal(invalidId.status, 400);

  const invalidPage = await request('/api/events?page=0');
  assert.equal(invalidPage.status, 400);
  const excessivePage = await request('/api/events?page=9007199254740991&limit=100');
  assert.equal(excessivePage.status, 400);
  const invalidDate = await request('/api/events?startDate=2026-02-31');
  assert.equal(invalidDate.status, 400);

  const invalidEmail = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'anything' }),
  });
  assert.equal(invalidEmail.status, 400);
});

test('CSRF origin guard blocks foreign origins and allows the configured frontend', async () => {
  const rejected = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example' },
  });
  assert.equal(rejected.status, 403);

  const allowedOrigin = new URL(process.env.CLIENT_URL).origin;
  const accepted = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Origin: allowedOrigin, 'Sec-Fetch-Site': 'cross-site' },
  });
  assert.equal(accepted.status, 200);
});

test('health endpoint reports dependency status without exposing infrastructure details', async () => {
  const response = await request('/api/health');
  const body = await response.json();
  assert.ok(response.status === 200 || response.status === 503);
  assert.equal(body.success, response.status === 200);
  assert.ok(['ok', 'degraded'].includes(body.status));
  assert.doesNotMatch(JSON.stringify(body), /postgres(?:ql)?:\/\/|password|secret|stack/i);
});
