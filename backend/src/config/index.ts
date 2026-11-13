import dotenv from "dotenv";
import path from "node:path";
dotenv.config();

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not defined in environment variables`);
  return value;
};

const port = (name: string, value: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return parsed;
};

const nodeEnv = required("NODE_ENV");
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production");
}

const clientUrl = required("CLIENT_URL");
try {
  const parsedClientUrl = new URL(clientUrl);
  if (!["http:", "https:"].includes(parsedClientUrl.protocol)) throw new Error();
} catch {
  throw new Error("CLIENT_URL must be an absolute HTTP or HTTPS URL");
}

const databaseUrl = required("DATABASE_URL");
try {
  const parsedDatabaseUrl = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) throw new Error();
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
}

const jwtSecret = required("JWT_SECRET");
if (nodeEnv === "production" && Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET must be at least 32 bytes in production");
}

const jwtExpiresIn = required("JWT_EXPIRES_IN");
if (!/^(?:[1-9]\d*)(?:ms|s|m|h|d|w|y)?$/.test(jwtExpiresIn)) {
  throw new Error("JWT_EXPIRES_IN must be a positive duration such as 15m or 1d");
}

export const config = {
  port: port("PORT", required("PORT")),
  nodeEnv,
  clientUrl,
  jwtSecret,
  jwtExpiresIn,
  mailHost: required("MAIL_HOST"),
  mailPort: port("MAIL_PORT", required("MAIL_PORT")),
  mailUser: required("MAIL_USER"),
  mailPassword: required("MAIL_PASSWORD"),
  mailFrom: required("MAIL_FROM"),
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined,
  adminFirstname: process.env.ADMIN_FIRSTNAME?.trim() || undefined,
  adminLastname: process.env.ADMIN_LASTNAME?.trim() || undefined,
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || undefined,
  vendorDocumentsDir: process.env.VENDOR_DOCUMENTS_DIR || path.resolve(__dirname, '../../private_uploads/vendor-documents'),
  eventBannersDir: process.env.EVENT_BANNERS_DIR || path.resolve(__dirname, '../../public_uploads/event-banners'),
  baseUrl: process.env.BASE_URL || '',
};
