const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

require('ts-node/register/transpile-only');

const sentMessages = [];
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'nodemailer') {
    return { createTransport: () => ({ sendMail: async message => { sentMessages.push(message); } }) };
  }
  if (request === '../config/index') {
    return { config: { mailHost: 'smtp.test', mailPort: 587, mailUser: 'test', mailPassword: 'test', mailFrom: 'billing@example.test' } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { sendVendorStandInvoice } = require('../src/services/emailService');
Module._load = originalLoad;

test('invoice email includes a downloadable PDF, payment reference, amount and due date', async () => {
  const dueAt = new Date('2026-12-08T12:00:00.000Z');
  await sendVendorStandInvoice({
    email: 'vendor@example.test',
    firstname: 'Vendor',
    customerId: 'vendor-1',
    vendorName: 'Vendor Company',
    vendorAddress: '1 Market Street',
    vendorPhone: '+27820000000',
    eventTitle: 'Sample Event',
    venue: 'Convention Centre',
    eventDate: new Date('2027-01-10T12:00:00.000Z'),
    issuerName: 'Event Organizer',
    issuerEmail: 'organizer@example.test',
    issuerPhone: '+27821111111',
    invoiceNumber: 'EVMS-20261124-ABC12345',
    issuedAt: new Date('2026-11-24T12:00:00.000Z'),
    amount: 450,
    dueAt,
    assignedStand: 'A-01',
    requestedStandType: 'Retail',
    requestedStandSize: '3m x 3m',
    areaSqm: 9,
    ratePerSqm: 50,
  });

  assert.equal(sentMessages.length, 1);
  const message = sentMessages[0];
  assert.match(message.text, /Invoice number: EVMS-20261124-ABC12345/);
  assert.match(message.text, /Payment reference: EVMS-20261124-ABC12345/);
  assert.match(message.text, /Amount due: ZAR 450\.00/);
  assert.match(message.text, new RegExp(`Due date: ${dueAt.toLocaleDateString('en-ZA').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

  assert.equal(message.attachments.length, 1);
  assert.equal(message.attachments[0].filename, 'EVMS-20261124-ABC12345.pdf');
  assert.equal(message.attachments[0].contentType, 'application/pdf');
  const pdf = message.attachments[0].content.toString('ascii');
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.match(pdf, /\(INVOICE\) Tj/);
  assert.match(pdf, /Payment reference: EVMS-20261124-ABC12345/);
  assert.match(pdf, /TOTAL/);
});
