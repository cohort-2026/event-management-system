import nodemailer from 'nodemailer';
import { config } from '@/config/index';

const transporter = nodemailer.createTransport({
  host: config.mailHost,
  port: config.mailPort,
  secure: config.mailPort === 465,
  requireTLS: true,
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

export const sendOrganizerInvitation = async (email: string, firstname: string, temporaryPassword: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Your EventMS organizer account',
    text: `Hello ${firstname},\n\nAn administrator created an EventMS organizer account for you. Sign in at ${config.clientUrl}/login with your email address and this temporary password:\n\n${temporaryPassword}\n\nYou must choose a permanent password before accessing your account. If you were not expecting this invitation, contact your platform administrator.`,
  });
};

export const sendOrganizerSetupLink = async (email: string, firstname: string, token: string): Promise<void> => {
  const setupUrl = new URL('/setup-password', config.clientUrl);
  setupUrl.searchParams.set('email', email);
  setupUrl.hash = new URLSearchParams({ token }).toString();

  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Set up your EventMS organizer account',
    text: `Hello ${firstname},\n\nAn administrator created an EventMS organizer account for you. Set your permanent password using this one-time link within 24 hours:\n\n${setupUrl.toString()}\n\nIf you were not expecting this invitation, contact your platform administrator.`,
  });
};

export const sendEventStatusNotification = async (
  email: string,
  firstname: string,
  eventTitle: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
): Promise<void> => {
  const approved = status === 'APPROVED';
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: `Your EventMS event was ${approved ? 'approved' : 'rejected'}`,
    text: approved
      ? `Hello ${firstname},\n\nYour event "${eventTitle}" has been approved and is now published on EventMS.`
      : `Hello ${firstname},\n\nYour event "${eventTitle}" was not approved.\n\nAdmin feedback:\n${rejectionReason ?? 'Please review and update your event.'}\n\nYou can edit the event and publish it when ready from your organizer dashboard.`,
  });
};

export const sendEventChangeNotification = async (email: string, eventTitle: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: `An event you registered for has changed: ${eventTitle}`,
    text: `The details for "${eventTitle}" have changed. Please review the event page for the latest information.`,
  });
};

export const sendEventCancellationNotification = async (email: string, eventTitle: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: `Event cancelled: ${eventTitle}`,
    text: `The event "${eventTitle}" has been cancelled by its organizer.`,
  });
};