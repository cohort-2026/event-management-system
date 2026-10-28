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

export const sendPasswordResetCode = async (email: string, code: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Your EventMS password reset code',
    text: `Your EventMS password reset code is ${code}. It expires in 10 minutes and can only be used once. If you did not request a password reset, you can ignore this email.`,
  });
};

export const sendAdminInvitation = async (email: string, firstname: string, temporaryPassword: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Your EventMS administrator account',
    text: `Hello ${firstname},\n\nA Platform Admin created an EventMS administrator account for you. Sign in at ${config.clientUrl}/login with this temporary password:\n\n${temporaryPassword}\n\nYou will be required to choose a new password before using the account. If you were not expecting this invitation, contact your platform administrator.`,
  });
};