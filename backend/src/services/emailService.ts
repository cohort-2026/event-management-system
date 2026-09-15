import nodemailer from 'nodemailer';
import { config } from '@/config/index';

const transporter = nodemailer.createTransport({
  host: config.mailHost,
  port: config.mailPort,
  secure: config.mailPort === 465,
  auth: {
    user: config.mailUser,
    pass: config.mailPassword,
  },
});

export const sendVerificationCode = async (email: string, code: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Verify your EventMS email address',
    text: `Your EventMS verification code is ${code}. It expires in 10 minutes.`,
  });
};