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
const otherVendorId = '00000000-0000-4000-8000-000000000007';
const applicationId = '00000000-0000-4000-8000-000000000004';
const invoiceId = '00000000-0000-4000-8000-000000000005';
const eventId = '00000000-0000-4000-8000-000000000006';
let application;
let invoiceStatus;
let notifications;
let auditEntries;
let createdInvoice;
let invoiceEmails;
let paymentEmails;
let recordedInvoiceEmailStatus;
let recordedInvoiceEmailSentAt;
let failInvoiceEmail;
let failPaymentEmail;
let createdApplication;

const prisma = {
  user: {
    findUnique: async ({ where }) => ({
      id: where.id,
      role: where.id === vendorId || where.id === otherVendorId ? 'VENDOR' : 'ORGANIZER',
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
  vendorProfile: { findUnique: async () => ({
    status: 'APPROVED', businessName: 'Test Vendor Company', businessRegistrationNumber: '123',
    businessDescription: 'Test business', productsServices: [],
  }) },
  vendorApplication: {
    findFirst: async ({ where }) =>
      where.id === application.id && where.event?.is?.organizerId === organizerId ? application : null,
    findUnique: async ({ where }) => where.id === application.id ? application : null,
    findUniqueOrThrow: async () => ({ vendorId }),
    create: async ({ data }) => { createdApplication = data; return { id: applicationId, ...data }; },
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
  event: {
    findFirst: async ({ where }) => where.id === eventId && where.organizerId === organizerId ? { id: eventId } : null,
    findUnique: async () => ({
    id: eventId,
    title: 'Test event',
    organizerId,
    organizer: { id: organizerId, firstname: 'Test', email: 'organizer@example.test' },
    status: 'PUBLISHED',
    startTime: new Date(Date.now() + 86400000),
    vendorStandsAvailable: 2,
    vendorStandRatePerSqm: 50,
    _count: { vendorApplications: 0 },
    }),
  },
  vendorInvoice: {
    findFirst: async ({ where }) =>
      where.id === invoiceId && where.application.is.vendorId === vendorId ? application.invoice : null,
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
      if (data.emailStatus) {
        recordedInvoiceEmailStatus = data.emailStatus;
        recordedInvoiceEmailSentAt = data.emailSentAt;
      }
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
      assert.ok(createdInvoice, 'invoice must be created before the email is sent');
      assert.equal(application.invoiceId, createdInvoice.id);
      invoiceEmails.push(details);
      if (failInvoiceEmail) throw new Error('SMTP unavailable');
    },
    sendVendorInvoiceStatusUpdate: async details => {
      paymentEmails.push(details);
      if (failPaymentEmail) throw new Error('SMTP unavailable');
    },
    sendVendorApplicationSubmitted: async () => {},
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
    eventId,
    invoiceId: invoiceId,
    companyName: 'Test Vendor Company',
    requestedStandType: 'Retail',
    status: 'APPROVED',
    invoice: { id: invoiceId, invoiceNumber: 'INV-123', amount: 450, currency: 'ZAR' },
    event: {
      id: eventId,
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
    tablesAndChairsAmount: 0,
    extensionCordAmount: 0,
    quotedAmount: 450,
  };
  invoiceStatus = 'ISSUED';
  recordedInvoiceEmailStatus = 'PENDING';
  recordedInvoiceEmailSentAt = null;
  failInvoiceEmail = false;
  failPaymentEmail = false;
  notifications = [];
  auditEntries = [];
  createdInvoice = null;
  createdApplication = null;
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
  assert.equal(paymentEmails[0].email, 'vendor@example.test');
  assert.equal(paymentEmails[0].amount, 450);
  assert.equal((await markPaid(organizerId, 'ORGANIZER')).status, 409);
  assert.equal(notifications.length, 1);
  assert.equal(paymentEmails.length, 1);
});

test('payment status change remains recorded and reports email failure', async () => {
  failPaymentEmail = true;
  const response = await markPaid(organizerId, 'ORGANIZER');
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(invoiceStatus, 'PAID');
  assert.equal(body.vendorEmailSent, false);
  assert.equal(notifications[0].recipientId, vendorId);
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
  application.tablesAndChairsAmount = 2000;
  application.extensionCordAmount = 100;
  application.quotedAmount = 2550;
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
  assert.equal(application.assignedStand, 'A-01');
  assert.equal(application.invoiceId, invoiceId);
  assert.equal(Number(createdInvoice.amount), 2932.50);
  assert.equal(Number(createdInvoice.taxRate), 15);
  assert.equal(Number(createdInvoice.taxAmount), 382.50);
  assert.equal(notifications[0].recipientId, vendorId);
  assert.match(notifications[0].message, /ZAR 2932\.50/);
  assert.equal(invoiceEmails[0].invoiceNumber, createdInvoice.invoiceNumber);
  assert.equal(invoiceEmails[0].email, 'vendor@example.test');
  assert.equal(invoiceEmails[0].amount, 2932.50);
  assert.equal(invoiceEmails[0].taxRate, 15);
  assert.equal(invoiceEmails[0].taxAmount, 382.50);
  assert.equal(invoiceEmails[0].tablesAndChairsAmount, 2000);
  assert.equal(invoiceEmails[0].extensionCordAmount, 100);
  assert.ok(invoiceEmails[0].dueAt instanceof Date);
  assert.equal(recordedInvoiceEmailStatus, 'SENT');
  assert.ok(recordedInvoiceEmailSentAt instanceof Date);
  const body = await response.json();
  assert.equal(body.invoiceEmailSent, true);
  assert.equal(body.invoiceEmailStatusRecorded, true);
  const repeated = await fetch(`${baseUrl}/vendors/${applicationId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedStand: 'A-01' }),
  });
  assert.equal(repeated.status, 409);
  assert.equal(invoiceEmails.length, 1);
});

test('separate allocations receive distinct invoice numbers', async () => {
  const token = jwt.sign({ sub: organizerId, role: 'ORGANIZER' }, secret, { expiresIn: '1h' });
  const numbers = [];
  for (const [id, stand] of [[applicationId, 'A-01'], ['00000000-0000-4000-8000-000000000008', 'A-02']]) {
    application.id = id;
    application.status = 'PENDING_REVIEW';
    application.invoiceId = null;
    application.invoice = null;
    const response = await fetch(`${baseUrl}/vendors/${id}/approve`, {
      method: 'PATCH',
      headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedStand: stand }),
    });
    assert.equal(response.status, 200);
    numbers.push(createdInvoice.invoiceNumber);
  }
  assert.match(numbers[0], /^EVMS-\d{8}-[A-F0-9]{8}$/);
  assert.notEqual(numbers[0], numbers[1]);
});

test('invoice application is accessible only to its vendor and event organizer', async () => {
  async function getAs(userId, role, url) {
    const token = jwt.sign({ sub: userId, role }, secret, { expiresIn: '1h' });
    return fetch(`${baseUrl}${url}`, { headers: { Cookie: `auth_token=${token}` } });
  }
  const applicationUrl = `/vendors/applications/${applicationId}`;
  for (const [userId, role] of [[vendorId, 'VENDOR'], [organizerId, 'ORGANIZER']]) {
    const response = await getAs(userId, role, applicationUrl);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.invoice.invoiceNumber, 'INV-123');
  }
  assert.equal((await getAs(otherVendorId, 'VENDOR', applicationUrl)).status, 404);
  assert.equal((await getAs(otherOrganizerId, 'ORGANIZER', applicationUrl)).status, 404);
  assert.equal((await getAs(vendorId, 'VENDOR', `/vendors/invoices/${invoiceId}`)).status, 200);
  assert.equal((await getAs(otherVendorId, 'VENDOR', `/vendors/invoices/${invoiceId}`)).status, 404);
});

test('invoice tax is rounded to the nearest cent', async () => {
  application.status = 'PENDING_REVIEW';
  application.invoice = null;
  application.invoiceId = null;
  application.quotedAmount = 0.10;
  const token = jwt.sign({ sub: organizerId, role: 'ORGANIZER' }, secret, { expiresIn: '1h' });
  const response = await fetch(`${baseUrl}/vendors/${applicationId}/approve`, {
    method: 'PATCH',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedStand: 'A-01' }),
  });
  assert.equal(response.status, 200);
  assert.equal(Number(createdInvoice.taxAmount), 0.02);
  assert.equal(Number(createdInvoice.amount), 0.12);
});

test('application quotes include only selected add-ons and reject invalid selections', async () => {
  const token = jwt.sign({ sub: vendorId, role: 'VENDOR' }, secret, { expiresIn: '1h' });
  const base = {
    eventId: '00000000-0000-4000-8000-000000000006',
    requestedStandType: 'Standard',
    requestedStandSize: '3m x 3m',
    standDescription: 'Products for the event',
  };
  for (const [selection, expected] of [
    [{}, 450],
    [{ tablesAndChairsIncluded: true }, 2450],
    [{ extensionCordIncluded: true }, 550],
    [{ tablesAndChairsIncluded: true, extensionCordIncluded: true }, 2550],
  ]) {
    const response = await fetch(`${baseUrl}/vendors/apply`, {
      method: 'POST',
      headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...base, ...selection }),
    });
    assert.equal(response.status, 201);
    assert.equal(createdApplication.quotedAmount, expected);
    assert.equal(createdApplication.tablesAndChairsAmount, selection.tablesAndChairsIncluded ? 2000 : 0);
    assert.equal(createdApplication.extensionCordAmount, selection.extensionCordIncluded ? 100 : 0);
  }
  const invalid = await fetch(`${baseUrl}/vendors/apply`, {
    method: 'POST',
    headers: { Cookie: `auth_token=${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...base, extensionCordIncluded: 'true' }),
  });
  assert.equal(invalid.status, 400);
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
  assert.equal(body.invoiceEmailStatusRecorded, true);
  assert.equal(recordedInvoiceEmailStatus, 'FAILED');
  assert.equal(recordedInvoiceEmailSentAt, null);
});
