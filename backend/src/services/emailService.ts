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

export const sendEventChangeNotification = async (email: string, eventTitle: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: `An event you registered for has changed: ${eventTitle}`,
    text: `The details for "${eventTitle}" have changed. Please review the event page for the latest information.`,
  });
};

export const sendEventCancellationNotification = async (email: string, eventTitle: string, reason: string): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: `Event cancelled: ${eventTitle}`,
    text: `The event "${eventTitle}" has been cancelled by its organizer.\n\nReason: ${reason}`,
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

export const sendWaitlistOfferNotification = async (details: {
  email: string;
  firstname: string;
  eventTitle: string;
  ticketType: string;
  expiresAt: Date;
}): Promise<void> => {
  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `A ticket is available: ${details.eventTitle}`,
    text: [
      `Hello ${details.firstname},`,
      '',
      `A ${details.ticketType} ticket is now available for ${details.eventTitle}.`,
      `Claim your offer before ${details.expiresAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}.`,
      'Sign in to your EventMS attendee dashboard and open My Waitlist Offers to claim it.',
      '',
      'This offer expires automatically after the stated deadline.',
    ].join('\n'),
  });
};
