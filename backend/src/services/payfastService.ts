import { createHash, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { config } from '../config';

const PAYFAST_HOSTS = [
  'www.payfast.co.za',
  'sandbox.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
];

export class PayFastValidationUnavailableError extends Error {}

const encodeValue = (value: string): string =>
  encodeURIComponent(value.trim())
    .replace(/[!'()*~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');

export const serializePayFastFields = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .filter(([name]) => name !== 'signature')
    .map(([name, value]) => `${name}=${encodeValue(value)}`)
    .join('&');

export const generatePayFastSignature = (
  fields: Record<string, string>,
  passphrase?: string,
): string => {
  let parameterString = serializePayFastFields(fields);
  if (passphrase) parameterString += `&passphrase=${encodeValue(passphrase)}`;
  return createHash('md5').update(parameterString).digest('hex');
};

export const isValidPayFastSignature = (
  fields: Record<string, string>,
  passphrase?: string,
): boolean => {
  const received = fields.signature;
  if (!received || !/^[a-f\d]{32}$/i.test(received)) return false;
  const expected = Buffer.from(generatePayFastSignature(fields, passphrase), 'hex');
  const actual = Buffer.from(received, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const createPayFastCheckout = (
  fields: Record<string, string>,
  passphrase: string | undefined,
  sandbox: boolean,
) => ({
  action: `https://${sandbox ? 'sandbox' : 'www'}.payfast.co.za/eng/process`,
  fields: {
    ...fields,
    signature: generatePayFastSignature(fields, passphrase),
  },
});

const normalizeIp = (ip: string): string =>
  ip.toLowerCase().startsWith('::ffff:') ? ip.slice(7) : ip;

export const isPayFastServerIp = async (remoteIp: string): Promise<boolean> => {
  const results = await Promise.all(PAYFAST_HOSTS.map(async host => {
    try {
      return await lookup(host, { all: true });
    } catch (error) {
      console.warn(
        `PayFast source IP lookup failed for ${host}:`,
        error instanceof Error ? error.message : 'Unknown DNS error',
      );
      return [];
    }
  }));
  const validIps = results.flat().map(address => normalizeIp(address.address));
  if (!validIps.length) throw new Error('Unable to resolve PayFast source hosts');
  return validIps.includes(normalizeIp(remoteIp));
};

export const validatePayFastNotification = async (
  fields: Record<string, string>,
  sandbox: boolean,
): Promise<boolean> => {
  const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
  let response: Response;
  try {
    response = await fetch(`https://${host}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: serializePayFastFields(fields),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
  } catch {
    throw new PayFastValidationUnavailableError('PayFast ITN verification request failed');
  }
  if (!response.ok) throw new PayFastValidationUnavailableError('PayFast ITN verification was unavailable');
  return (await response.text()).trim() === 'VALID';
};

export const isPayFastConfigured = (): boolean =>
  Boolean(
    config.payfast.merchantId &&
    config.payfast.merchantKey &&
    config.payfast.notifyUrl,
  );
