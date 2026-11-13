import nodemailer from 'nodemailer';
import { config } from '../config/index';

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

export const sendVendorStandInvoice = async (details: {
  email: string;
  firstname: string;
  eventTitle: string;
  invoiceNumber: string;
  amount: number;
  dueAt: Date;
  assignedStand: string;
  requestedStandSize: string;
  areaSqm: number;
  ratePerSqm: number;
}): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `EventMS stand invoice ${details.invoiceNumber}`,
    text: [
      `Hello ${details.firstname},`,
      '',
      `Your stand application for "${details.eventTitle}" has been approved.`,
      `Assigned stand: ${details.assignedStand}`,
      `Requested size: ${details.requestedStandSize} (${details.areaSqm.toFixed(2)} m²)`,
      `Rate: ZAR ${details.ratePerSqm.toFixed(2)} per m²`,
      `Amount due: ZAR ${details.amount.toFixed(2)}`,
      `Invoice number: ${details.invoiceNumber}`,
      `Due date: ${details.dueAt.toLocaleDateString('en-ZA')}`,
      '',
      'Please contact the event organizer for payment instructions.',
    ].join('\n'),
  });
};

export const sendVendorProfileDecision = async (details: {
  email: string;
  firstname: string;
  businessName: string;
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `EventMS vendor profile ${details.status.toLowerCase()}`,
    text: [
      `Hello ${details.firstname},`,
      '',
      `The vendor profile for ${details.businessName} was ${details.status.toLowerCase()}.`,
      ...(details.rejectionReason ? ['', `Review feedback: ${details.rejectionReason}`] : []),
      '',
      details.status === 'APPROVED'
        ? 'You can now apply to participate in published events.'
        : 'Please review the feedback and update your profile before resubmitting.',
    ].join('\n'),
  });
};

export const sendVendorApplicationSubmitted = async (details: {
  email: string;
  firstname: string;
  businessName: string;
  eventTitle: string;
}): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `New vendor application: ${details.eventTitle}`,
    text: `Hello ${details.firstname},\n\n${details.businessName} submitted a vendor stand application for "${details.eventTitle}". Review it in your EventMS organizer dashboard.`,
  });
};

export const sendVendorApplicationRejected = async (details: {
  email: string;
  firstname: string;
  eventTitle: string;
  rejectionReason: string;
}): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `EventMS stand application update: ${details.eventTitle}`,
    text: `Hello ${details.firstname},\n\nYour stand application for "${details.eventTitle}" was not approved.\n\nReason: ${details.rejectionReason}\n\nYou may update the application and submit it again.`,
  });
};