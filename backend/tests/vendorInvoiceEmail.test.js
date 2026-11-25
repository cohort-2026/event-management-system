const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

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
const { sendVendorStandInvoice, sendVendorInvoiceStatusUpdate } = require('../src/services/emailService');
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
    amount: 2932.50,
    taxRate: 15,
    taxAmount: 382.50,
    dueAt,
    assignedStand: 'A-01',
    requestedStandType: 'Retail',
    requestedStandSize: '3m x 3m',
    areaSqm: 9,
    ratePerSqm: 50,
    tablesAndChairsAmount: 2000,
    extensionCordAmount: 100,
  });

  assert.equal(sentMessages.length, 1);
  const message = sentMessages[0];
  assert.equal(message.to, 'vendor@example.test');
  assert.match(message.text, /Invoice number: EVMS-20261124-ABC12345/);
  assert.match(message.text, /Payment reference: EVMS-20261124-ABC12345/);
  assert.match(message.text, /Subtotal: ZAR 2550\.00/);
  assert.match(message.text, /Tax \(15%\): ZAR 382\.50/);
  assert.match(message.text, /Amount due: ZAR 2932\.50/);
  assert.match(message.text, /Tables and chairs - 20 chairs, 4 tables: ZAR 2000\.00/);
  assert.match(message.text, /Extension cord - 10 m: ZAR 100\.00/);
  assert.match(message.text, new RegExp(`Due date: ${dueAt.toLocaleDateString('en-ZA').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

  assert.equal(message.attachments.length, 1);
  assert.equal(message.attachments[0].filename, 'EVMS-20261124-ABC12345.pdf');
  assert.equal(message.attachments[0].contentType, 'application/pdf');
  const pdf = message.attachments[0].content.toString('ascii');
  assert.ok(pdf.startsWith('%PDF-1.4'));
  assert.match(pdf, /\(INVOICE\) Tj/);
  assert.match(pdf, /Vendor Company/);
  assert.match(pdf, /1 Market Street/);
  assert.match(pdf, /vendor@example\.test/);
  assert.match(pdf, /Sample Event/);
  assert.match(pdf, /Convention Centre/);
  assert.match(pdf, /SHIPPING VENUE/);
  assert.doesNotMatch(pdf, /F\.O\.B\./);
  assert.match(pdf, /Assigned stand: A-01/);
  assert.match(pdf, /Retail stand - 3m x 3m/);
  assert.ok(pdf.includes(`Due date: ${dueAt.toLocaleDateString('en-ZA')}`));
  assert.match(pdf, /Payment instructions: contact organizer@example\.test/);
  assert.match(pdf, /Payment reference: EVMS-20261124-ABC12345/);
  assert.match(pdf, /Tables and chairs - 20 chairs, 4 tables/);
  assert.match(pdf, /Extension cord - 10 m/);
  assert.match(pdf, /ZAR 450\.00/);
  assert.match(pdf, /ZAR 2550\.00/);
  assert.match(pdf, /TAX \\\(15%\\\)/);
  assert.match(pdf, /ZAR 382\.50/);
  assert.match(pdf, /ZAR 2932\.50/);
  assert.match(pdf, /TOTAL/);
});

test('payment status email identifies the vendor, invoice, amount and paid status', async () => {
  await sendVendorInvoiceStatusUpdate({
    email: 'vendor@example.test',
    firstname: 'Vendor',
    eventTitle: 'Sample Event',
    invoiceNumber: 'INV-123',
    amount: 2932.50,
    currency: 'ZAR',
    status: 'PAID',
  });
  const message = sentMessages[sentMessages.length - 1];
  assert.equal(message.to, 'vendor@example.test');
  assert.match(message.subject, /INV-123 paid/);
  assert.match(message.text, /invoice INV-123.*now PAID/);
  assert.match(message.text, /Amount: ZAR 2932\.50/);
});

test('downloaded invoice lists selected add-ons separately from the stand', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'services', 'vendorInvoicePdf.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let blob;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    Blob,
    URL: { createObjectURL: value => { blob = value; return 'blob:test'; }, revokeObjectURL: () => {} },
    document: {
      createElement: () => ({ click: () => {}, remove: () => {} }),
      body: { appendChild: () => {} },
    },
    window: { setTimeout: () => {} },
  });
  const application = {
    invoice: { amount: 2932.50, taxRate: 15, taxAmount: 382.50, currency: 'ZAR', invoiceNumber: 'INV-1', issuedAt: '2026-11-24', dueAt: '2026-12-08' },
    vendorId: 'vendor-1',
    companyName: 'Vendor Company',
    vendor: { email: 'vendor@example.test', vendorProfile: { businessAddress: '1 Market Street' } },
    event: { title: 'Sample Event', venue: 'Convention Centre', date: '2027-01-10' },
    assignedStand: 'A-01',
    requestedStandType: 'Standard',
    requestedStandSize: '3m x 3m',
    standAreaSqm: 9,
    standRatePerSqm: 50,
    tablesAndChairsAmount: 2000,
    extensionCordAmount: 100,
  };
  exports.downloadInvoicePdf(application);
  let pdf = await blob.text();
  assert.doesNotMatch(pdf, /SHIP VIA/);
  assert.match(pdf, /SHIP DATE/);
  assert.match(pdf, /SHIPPING VENUE/);
  assert.doesNotMatch(pdf, /F\.O\.B\./);
  assert.match(pdf, /Vendor Company/);
  assert.match(pdf, /1 Market Street/);
  assert.match(pdf, /Sample Event/);
  assert.match(pdf, /Convention Centre/);
  assert.match(pdf, /Assigned stand: A-01/);
  assert.match(pdf, /Standard stand - 3m x 3m/);
  assert.match(pdf, /Payment instructions: contact the event organizer/);
  assert.ok(pdf.includes(`Due date: ${new Date(application.invoice.dueAt).toLocaleDateString('en-ZA')}`));
  assert.match(pdf, /Tables and chairs - 20 chairs, 4 tables/);
  assert.match(pdf, /Extension cord - 10 m/);
  assert.match(pdf, /ZAR 450\.00/);
  assert.match(pdf, /ZAR 2550\.00/);
  assert.match(pdf, /TAX \\\(15%\\\)/);
  assert.match(pdf, /ZAR 382\.50/);
  assert.match(pdf, /ZAR 2932\.50/);

  application.invoice.amount = 450;
  application.invoice.taxRate = 0;
  application.invoice.taxAmount = 0;
  application.tablesAndChairsAmount = 0;
  application.extensionCordAmount = 0;
  exports.downloadInvoicePdf(application);
  pdf = await blob.text();
  assert.doesNotMatch(pdf, /Tables and chairs|Extension cord/);
});
