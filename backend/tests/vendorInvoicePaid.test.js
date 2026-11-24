const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('ts-node/register/transpile-only');

const secret = 'vendor-invoice-test-secret';
const organizerId = '00000000-0000-4000-8000-000000000001';
const otherOrganizerId = '00000000-0000-4000-8000-000000000002';
const vendorId = '00000000-0000-4000-8000-000000000003';
const applicationId = '00000000-0000-4000-8000-000000000004';
const invoiceId = '00000000-0000-4000-8000-000000000005';
let application;
let invoiceStatus;
let notifications;
let auditEntries;
let createdInvoice;
let invoiceEmails;
let paymentEmails;
let recordedInvoiceEmailStatus;
let failInvoiceEmail;

const prisma = {
  user: {
    findUnique: async ({ where }) => ({
      id: where.id,
      role: where.id === vendorId ? 'VENDOR' : 'ORGANIZER',
      isActive: true,
      mustChangePassword: false,
      firstname: 'Test',
      lastname: 'Organizer',
      organizationName: 'Test Organization',
      organizationEmail: 'test@example.test',
      organizationRegistrationNumber: '123456789',
      phone: '+27821234567',
      profileApprovalStatus: 'APPROVED',
    }),
  },
  vendorProfile: { findUnique: async () => ({ status: 'APPROVED' }) },
  vendorApplication: {
    findFirst: async ({ where }) =>
      where.id === application.id && where.event.is.organizerId === organizerId ? application : null,
    findUnique: async ({ where }) => where.id === application.id ? application : null,
    findUniqueOrThrow: async () => ({ vendorId }),
    updateMany: async ({ where, data }) => {
      if (where.id !== application.id || where.status !== application.status) return { count: 0 };
      Object.assign(application, data);
      return { count: 1 };
    },
    update: async ({ data }) => {
      application.invoiceId = data.invoiceId;
      return application;
    },
  },
  event: { findUnique: async () => ({
    status: 'PUBLISHED',
    startTime: new Date(Date.now() + 86400000),
    vendorStandsAvailable: 2,
    _count: { vendorApplications: 0 },
  }) },
  vendorInvoice: {
    create: async ({ data }) => {
      createdInvoice = { id: invoiceId, ...data };
      return createdInvoice;
    },
    updateMany: async ({ where, data }) => {
      if (where.id !== invoiceId || where.status !== invoiceStatus ||
        where.application.is.id !== application.id ||
        where.application.is.status !== application.status ||
        where.application.is.event.is.organizerId !== organizerId) return { count: 0 };
      invoiceStatus = data.status;
      if (data.emailStatus) recordedInvoiceEmailStatus = data.emailStatus;
      return { count: 1 };
    },
  },
  auditLog: { create: async ({ data }) => { auditEntries.push(data); } },
  notification: { create: async ({ data }) => { notifications.push(data); } },
  $queryRaw: async () => [],
  $transaction: async callback => callback(prisma),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../lib/prisma') return { prisma };
  if (request === '../config/index') return { config: { jwtSecret: secret } };
  if (request === '../services/emailService') return {
    sendVendorStandInvoice: async details => {
      invoiceEmails.push(details);
      if (failInvoiceEmail) throw new Error('SMTP unavailable');
    },
    sendVendorInvoiceStatusUpdate: async details => { paymentEmails.push(details); },
  };
  return originalLoad.call(this, request, parent, isMain);
};
const routes = require('../src/routes/vendorRoutes').default;
Module._load = originalLoad;

const app = express();
app.use(express.json(), cookieParser());
app.use('/vendors', routes);
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
  application = {
    id: applicationId,
    vendorId,
    invoiceId: invoiceId,
    companyName: 'Test Vendor Company',
    requestedStandType: 'Retail',
    status: 'APPROVED',
    invoice: { id: invoiceId, invoiceNumber: 'INV-123', amount: 450, currency: 'ZAR' },
    event: {
      id: '00000000-0000-4000-8000-000000000006',
      title: 'Test event',
      venue: 'Test venue',
      date: new Date(Date.now() + 86400000),
      organizerId,
      organizer: {
        firstname: 'Test',
        lastname: 'Organizer',
        email: 'organizer@example.test',
        organizationName: 'Test Organization',
        organizationEmail: 'organizer@example.test',
        phone: '+27821234567',
      },
    },
    vendor: {
      email: 'vendor@example.test',
      firstname: 'Vendor',
      vendorProfile: { status: 'APPROVED', businessAddress: '123 Test Street', contactPhone: '+27820000000' },
    },
    requestedStandSize: '3m x 3m',
    standAreaSqm: 9,
    standRatePerSqm: 50,
    quotedAmount: 450,
  };
  invoiceStatus = 'ISSUED';
  recordedInvoiceEmailStatus = 'PENDING';
  failInvoiceEmail = false;
  notifications = [];
  auditEntries = [];
  createdInvoice = null;
  invoiceEmails = [];
  paymentEmails = [];
});

async function markPaid(userId, role) {
  const token = jwt.sign({ sub: userId, role }, secret, { expiresIn: '1h' });
  return fetch(`${baseUrl}/vendors/${applicationId}/invoice/paid`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}` },
  });
}

test('only the event organizer can mark an issued invoice paid once', async () => {
  assert.equal((await markPaid(vendorId, 'VENDOR')).status, 403);
  assert.equal((await markPaid(otherOrganizerId, 'ORGANIZER')).status, 404);
  assert.equal(invoiceStatus, 'ISSUED');
  assert.equal((await markPaid(organizerId, 'ORGANIZER')).status, 200);
  assert.equal(invoiceStatus, 'PAID');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].recipientId, vendorId);
  assert.equal(notifications[0].link, `/vendor/applications/${applicationId}/staff`);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].actorId, organizerId);
  assert.equal(paymentEmails.length, 1);
  assert.equal(paymentEmails[0].status, 'PAID');
  assert.equal(paymentEmails[0].invoiceNumber, 'INV-123');
  assert.equal((await markPaid(organizerId, 'ORGANIZER')).status, 409);
  assert.equal(notifications.length, 1);
  assert.equal(paymentEmails.length, 1);
});

test('unapproved applications and void invoices cannot be marked paid', async () => {
  application.status = 'PENDING_REVIEW';
  assert.equal((await markPaid(organizerId, 'ORGANIZER')).status, 409);
  application.status = 'APPROVED';
  invoiceStatus = 'VOID';
  assert.equal((await markPaid(organizerId, 'ORGANIZER')).status, 409);
  assert.equal(notifications.length, 0);
});

test('approving a stand creates its invoice and notifies the vendor', async () => {
  application.status = 'PENDING_REVIEW';
  application.invoice = null;
  application.invoiceId = null;
  const token = jwt.sign({ sub: organizerId, role: 'ORGANIZER' }, secret, { expiresIn: '1h' });
  const response = await fetch(`${baseUrl}/vendors/${applicationId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedStand: 'A-01' }),
  });
  assert.equal(response.status, 200);
  assert.equal(application.status, 'APPROVED');
  assert.equal(application.invoiceId, invoiceId);
  assert.equal(createdInvoice.amount, 450);
  assert.equal(notifications[0].recipientId, vendorId);
  assert.equal(invoiceEmails[0].invoiceNumber, createdInvoice.invoiceNumber);
  assert.equal(invoiceEmails[0].amount, 450);
  assert.ok(invoiceEmails[0].dueAt instanceof Date);
  assert.equal(recordedInvoiceEmailStatus, 'SENT');
});

test('an allocation with an invoice cannot generate a duplicate invoice', async () => {
  application.status = 'PENDING_REVIEW';
  application.invoice = { id: invoiceId, invoiceNumber: 'INV-123', amount: 450, currency: 'ZAR' };
  application.invoiceId = invoiceId;
  const token = jwt.sign({ sub: organizerId, role: 'ORGANIZER' }, secret, { expiresIn: '1h' });
  const response = await fetch(`${baseUrl}/vendors/${applicationId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedStand: 'A-01' }),
  });
  assert.equal(response.status, 409);
  assert.equal(createdInvoice, null);
  assert.equal(invoiceEmails.length, 0);
});

test('failed invoice email delivery is recorded as failed', async () => {
  application.status = 'PENDING_REVIEW';
  application.invoice = null;
  application.invoiceId = null;
  failInvoiceEmail = true;
  const token = jwt.sign({ sub: organizerId, role: 'ORGANIZER' }, secret, { expiresIn: '1h' });
  const response = await fetch(`${baseUrl}/vendors/${applicationId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedStand: 'A-01' }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.invoiceEmailSent, false);
  assert.equal(recordedInvoiceEmailStatus, 'FAILED');
});
