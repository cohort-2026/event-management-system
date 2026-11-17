const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '5000',
  CLIENT_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN: '1d',
  MAIL_HOST: 'localhost',
  MAIL_PORT: '25',
  MAIL_USER: 'test',
  MAIL_PASSWORD: 'test',
  MAIL_FROM: 'test@example.com',
});

const {
  createPayFastCheckout,
  generatePayFastSignature,
  isValidPayFastSignature,
  serializePayFastFields,
} = require('../backend/dist/services/payfastService.js');

test('PayFast signatures encode field values and validate without accepting tampering', () => {
  const fields = {
    merchant_id: '10000100',
    amount: '15.00',
    item_name: 'Workshop ticket',
    return_url: 'https://example.test/attendee/payment/return?bookingId=abc',
  };
  const signedString = [
    'merchant_id=10000100',
    'amount=15.00',
    'item_name=Workshop+ticket',
    'return_url=https%3A%2F%2Fexample.test%2Fattendee%2Fpayment%2Freturn%3FbookingId%3Dabc',
    'passphrase=test+passphrase',
  ].join('&');
  const expected = createHash('md5').update(signedString).digest('hex');
  const signedFields = { ...fields, signature: expected };

  assert.equal(generatePayFastSignature(fields, 'test passphrase'), expected);
  assert.equal(isValidPayFastSignature(signedFields, 'test passphrase'), true);
  assert.equal(isValidPayFastSignature({ ...signedFields, amount: '16.00' }, 'test passphrase'), false);
  assert.equal(serializePayFastFields(signedFields), signedString.replace(/&passphrase=.*$/, ''));
});

test('PayFast checkout targets the selected hosted-checkout environment', () => {
  const fields = { merchant_id: '10000100', amount: '15.00', item_name: 'Workshop ticket' };

  assert.equal(
    createPayFastCheckout(fields, undefined, true).action,
    'https://sandbox.payfast.co.za/eng/process',
  );
  assert.equal(
    createPayFastCheckout(fields, undefined, false).action,
    'https://www.payfast.co.za/eng/process',
  );
});

test('PayFast signatures use form encoding for reserved characters', () => {
  assert.equal(
    serializePayFastFields({ item_name: "Kids' Workshop (VIP)! ~" }),
    'item_name=Kids%27+Workshop+%28VIP%29%21+%7E',
  );
});
