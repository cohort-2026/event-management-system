import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT ?? 5000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'change_this_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  mailHost: process.env.MAIL_HOST ?? '',
  mailPort: Number(process.env.MAIL_PORT ?? 587),
  mailUser: process.env.MAIL_USER ?? '',
  mailPassword: process.env.MAIL_PASSWORD ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'no-reply@example.com',
};
