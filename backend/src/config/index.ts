import dotenv from "dotenv";
import path from "node:path";
dotenv.config();

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port between 1 and 65535");
}

export const config = {
  port,
  nodeEnv:
    process.env.NODE_ENV ??
    (() => {
      throw new Error("NODE_ENV is not defined in environment variables");
    })(),
  clientUrl:
    process.env.CLIENT_URL ??
    (() => {
      throw new Error("CLIENT_URL is not defined in environment variables");
    })(),
  jwtSecret:
    process.env.JWT_SECRET ??
    (() => {
      throw new Error("JWT_SECRET is not defined in environment variables");
    })(),
  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ??
    (() => {
      throw new Error("JWT_EXPIRES_IN is not defined in environment variables");
    })(),
  mailHost:
    process.env.MAIL_HOST ??
    (() => {
      throw new Error("MAIL_HOST is not defined in environment variables");
    })(),
  mailPort: Number(
    process.env.MAIL_PORT ??
      (() => {
        throw new Error("MAIL_PORT is not defined in environment variables");
      })(),
  ),
  mailUser:
    process.env.MAIL_USER ??
    (() => {
      throw new Error("MAIL_USER is not defined in environment variables");
    })(),
  mailPassword:
    process.env.MAIL_PASSWORD ??
    (() => {
      throw new Error("MAIL_PASSWORD is not defined in environment variables");
    })(),
  mailFrom:
    process.env.MAIL_FROM ??
    (() => {
      throw new Error("MAIL_FROM is not defined in environment variables");
    })(),
  platformAdminEmail: process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() || undefined,
  platformAdminFirstname: process.env.PLATFORM_ADMIN_FIRSTNAME?.trim() || undefined,
  platformAdminLastname: process.env.PLATFORM_ADMIN_LASTNAME?.trim() || undefined,
  platformAdminInitialPassword: process.env.PLATFORM_ADMIN_INITIAL_PASSWORD || undefined,
  vendorDocumentsDir: process.env.VENDOR_DOCUMENTS_DIR || path.resolve(__dirname, '../../private_uploads/vendor-documents'),
};
