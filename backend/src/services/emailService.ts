import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
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

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]!));

export const sendBookingConfirmationEmail = async (details: {
  email: string;
  attendeeName: string;
  bookingReference: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  venue: string;
  ticketAccessUrl: string;
  tickets: Array<{ referenceNumber: string; qrPayload: string }>;
}): Promise<void> => {
  const attachments = await Promise.all(details.tickets.map(async (ticket, index) => ({
    filename: `${ticket.referenceNumber}.png`,
    content: await QRCode.toBuffer(ticket.qrPayload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
    }),
    contentType: 'image/png',
    cid: `ticket-qr-${index}@eventms`,
    contentDisposition: 'inline' as const,
  })));
  const escape = escapeHtml;
  const startLabel = details.startTime.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg', dateStyle: 'full', timeStyle: 'short',
  });
  const endLabel = details.endTime.toLocaleTimeString('en-ZA', {
    timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit',
  });
  const ticketHtml = details.tickets.map((ticket, index) => `
    <section style="margin:24px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;text-align:center">
      <p style="font-weight:bold">Ticket ${escape(ticket.referenceNumber)}</p>
      <img src="cid:ticket-qr-${index}@eventms" width="240" height="240" alt="QR code for ticket ${escape(ticket.referenceNumber)}" />
    </section>`).join('');

  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `Your ticket for ${details.eventTitle} is confirmed`,
    text: [
      `Hello ${details.attendeeName},`,
      '',
      `Your booking for ${details.eventTitle} is confirmed.`,
      `Booking reference: ${details.bookingReference}`,
      `Date and time: ${startLabel} - ${endLabel}`,
      `Venue: ${details.venue || 'Online event'}`,
      ...details.tickets.map(ticket => `Ticket reference: ${ticket.referenceNumber}`),
      '',
      `View your tickets and QR codes or download a PDF copy: ${details.ticketAccessUrl}`,
    ].join('\n'),
    html: `
      <main style="font-family:Arial,sans-serif;color:#171717;max-width:640px;margin:auto">
        <h1 style="font-size:24px">Your ticket is confirmed</h1>
        <p>Hello ${escape(details.attendeeName)},</p>
        <p>Your booking for <strong>${escape(details.eventTitle)}</strong> is confirmed.</p>
        <p><strong>Booking reference:</strong> ${escape(details.bookingReference)}<br />
        <strong>Date and time:</strong> ${escape(startLabel)} - ${escape(endLabel)}<br />
        <strong>Venue:</strong> ${escape(details.venue || 'Online event')}</p>
        <h2 style="font-size:18px">Your ticket QR codes</h2>
        ${ticketHtml}
        <p><a href="${escape(details.ticketAccessUrl)}">Open your tickets and event details</a> to view the same ticket layout or download it as a PDF.</p>
        <p>Keep this email available at the event entrance.</p>
      </main>`,
    attachments,
  });
};

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
