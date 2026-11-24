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
  customerId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone: string;
  eventTitle: string;
  venue: string;
  eventDate: Date;
  issuerName: string;
  issuerEmail: string;
  issuerPhone: string;
  invoiceNumber: string;
  issuedAt: Date;
  amount: number;
  dueAt: Date;
  assignedStand: string;
  requestedStandType: string;
  requestedStandSize: string;
  areaSqm: number;
  ratePerSqm: number;
}): Promise<void> => {
  const pdfText = (value: string) => value.replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');
  const commands: string[] = [];
  const text = (x: number, y: number, value: string, size = 9, color = '0.12 0.16 0.24') => {
    commands.push(`${color} rg BT /F1 ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = '0.72 0.75 0.8') => {
    commands.push(`${color} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const rect = (x: number, y: number, width: number, height: number, color: string) => {
    commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  };
  const date = (value: Date) => value.toLocaleDateString('en-ZA');
  const fit = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 3)}...` : value;
  const issuerName = details.issuerName || 'Event Organizer';
  const vendorName = details.vendorName || details.firstname;
  const headerBlue = '0.25 0.34 0.58';
  const paleBlue = '0.42 0.55 0.79';

  // Issuer header and invoice metadata.
  text(54, 724, fit(issuerName, 38), 14, headerBlue);
  text(54, 707, fit(details.issuerEmail || 'Address not provided', 48), 8);
  if (details.issuerPhone) text(54, 695, fit(`Phone: ${details.issuerPhone}`, 48), 8);
  text(414, 724, 'INVOICE', 24, paleBlue);
  text(420, 705, 'DATE', 7);
  text(474, 705, date(details.issuedAt), 8);
  text(420, 691, 'INVOICE #', 7);
  text(474, 691, details.invoiceNumber, 8);
  text(420, 677, 'CUSTOMER ID', 7);
  text(474, 677, details.customerId, 7);

  // Bill-to and ship-to blocks.
  rect(54, 638, 250, 15, headerBlue);
  rect(316, 638, 242, 15, headerBlue);
  text(60, 643, 'BILL TO:', 8, '1 1 1');
  text(322, 643, 'SHIP TO:', 8, '1 1 1');
  text(58, 622, fit(vendorName, 45), 8);
  text(58, 609, fit(details.vendorAddress || 'Address not provided', 48), 8);
  text(58, 596, fit(details.email, 48), 8);
  if (details.vendorPhone) text(58, 583, fit(`Phone: ${details.vendorPhone}`, 48), 8);
  text(320, 622, fit(details.eventTitle, 42), 8);
  text(320, 609, fit(details.venue || 'Venue not provided', 43), 8);
  text(320, 596, `Assigned stand: ${details.assignedStand}`, 8);
  text(320, 583, `Stand date: ${date(details.eventDate)}`, 8);

  // Shipping and payment terms strip.
  rect(54, 550, 504, 16, headerBlue);
  text(60, 555, 'SALESPERSON', 7, '1 1 1');
  text(155, 555, 'P.O. #', 7, '1 1 1');
  text(231, 555, 'SHIP DATE', 7, '1 1 1');
  text(314, 555, 'SHIP VIA', 7, '1 1 1');
  text(405, 555, 'F.O.B.', 7, '1 1 1');
  text(482, 555, 'TERMS', 7, '1 1 1');
  text(60, 537, issuerName.slice(0, 17), 7);
  text(155, 537, details.invoiceNumber.slice(-10), 7);
  text(231, 537, date(details.eventDate), 7);
  text(314, 537, 'Event stand', 7);
  text(405, 537, fit(details.venue, 13) || '-', 7);
  text(482, 537, 'Net 14', 7);
  [148, 224, 307, 398, 475].forEach(x => line(x, 530, x, 566));
  line(54, 530, 558, 530);

  // Invoice item table.
  rect(54, 503, 504, 18, headerBlue);
  text(63, 509, 'ITEM #', 8, '1 1 1');
  text(133, 509, 'DESCRIPTION', 8, '1 1 1');
  text(365, 509, 'QTY', 8, '1 1 1');
  text(414, 509, 'UNIT PRICE', 8, '1 1 1');
  text(500, 509, 'TOTAL', 8, '1 1 1');
  const standDescription = `${details.requestedStandType} stand - ${details.requestedStandSize}`;
  text(60, 486, details.assignedStand, 8);
  text(133, 486, standDescription.slice(0, 45), 8);
  text(365, 486, `${details.areaSqm.toFixed(2)} sqm`, 8);
  text(414, 486, `ZAR ${details.ratePerSqm.toFixed(2)}`, 8);
  text(500, 486, `ZAR ${details.amount.toFixed(2)}`, 8);
  line(54, 476, 558, 476);
  [124, 356, 407, 493].forEach(x => line(x, 476, x, 521));
  line(54, 521, 558, 521);

  // Comments and totals.
  rect(54, 450, 285, 16, '0.73 0.73 0.73');
  text(60, 455, 'Other Comments or Special Instructions', 8, '1 1 1');
  line(54, 394, 339, 394);
  line(54, 450, 54, 394);
  line(339, 450, 339, 394);
  text(60, 435, `Payment amount due: ZAR ${details.amount.toFixed(2)}`, 8);
  text(60, 420, `Due date: ${date(details.dueAt)}`, 8);
  text(60, 405, `Payment reference: ${details.invoiceNumber}`, 8);
  text(365, 450, 'SUBTOTAL', 8);
  text(490, 450, `ZAR ${details.amount.toFixed(2)}`, 8);
  line(358, 444, 558, 444);
  text(365, 427, 'TAX', 8);
  text(490, 427, '-', 8);
  line(358, 421, 558, 421);
  rect(358, 393, 200, 20, '0.90 0.92 0.96');
  text(365, 400, 'TOTAL', 9);
  text(485, 400, `ZAR ${details.amount.toFixed(2)}`, 9, headerBlue);
  text(80, 372, `Questions? Contact ${issuerName} at ${details.issuerEmail || 'the event organizer'}.`, 8);
  text(203, 356, 'Thank you for your business!', 11, headerBlue);
  text(164, 338, `Payment instructions: contact ${details.issuerEmail || 'the event organizer'}.`, 8);
  line(54, 319, 558, 319, '0.35 0.35 0.35');

  // Remittance stub.
  text(270, 301, 'REMITTANCE', 10, headerBlue);
  text(54, 280, fit(issuerName, 42), 12, headerBlue);
  text(54, 265, fit(details.issuerEmail || 'Address not provided', 48), 8);
  if (details.issuerPhone) text(54, 252, fit(`Phone: ${details.issuerPhone}`, 48), 8);
  text(395, 279, 'DATE', 7);
  text(450, 279, date(details.issuedAt), 8);
  text(395, 264, 'INVOICE #', 7);
  text(450, 264, details.invoiceNumber, 8);
  text(395, 249, 'CUSTOMER ID', 7);
  text(450, 249, details.customerId, 7);
  text(330, 224, 'AMOUNT ENCLOSED', 8);
  line(430, 218, 558, 218);
  line(430, 241, 558, 241);
  line(430, 218, 430, 241);
  line(558, 218, 558, 241);
  text(54, 72, `Invoice ${details.invoiceNumber} | Due ${date(details.dueAt)}`, 7, '0.42 0.45 0.5');

  const drawingCommands = commands.join('\n');
  const pdfObjects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(drawingCommands, 'ascii')} >>\nstream\n${drawingCommands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  pdfObjects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${pdfObjects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `EventMS stand invoice ${details.invoiceNumber}`,
    attachments: [{
      filename: `${details.invoiceNumber}.pdf`,
      content: Buffer.from(pdf, 'ascii'),
      contentType: 'application/pdf',
    }],
    text: [
      `Hello ${details.firstname},`,
      '',
      `Your stand application for "${details.eventTitle}" has been approved.`,
      `Assigned stand: ${details.assignedStand}`,
      `Requested size: ${details.requestedStandSize} (${details.areaSqm.toFixed(2)} m²)`,
      `Rate: ZAR ${details.ratePerSqm.toFixed(2)} per m²`,
      `Amount due: ZAR ${details.amount.toFixed(2)}`,
      `Invoice number: ${details.invoiceNumber}`,
      `Payment reference: ${details.invoiceNumber}`,
      `Due date: ${details.dueAt.toLocaleDateString('en-ZA')}`,
      '',
      'Please contact the event organizer for payment instructions.',
    ].join('\n'),
  });
};

export const sendVendorInvoiceStatusUpdate = async (details: {
  email: string;
  firstname: string;
  eventTitle: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'VOID';
}): Promise<void> => {
  const statusMessage = details.status === 'PAID'
    ? 'Your payment has been recorded as paid. Staff passes for your stand are now available in your vendor dashboard.'
    : 'This invoice has been voided. Please contact the event organizer if you have questions.';
  await transporter.sendMail({
    from: config.mailFrom,
    to: details.email,
    subject: `EventMS invoice ${details.invoiceNumber} ${details.status.toLowerCase()}`,
    text: [
      `Hello ${details.firstname},`,
      '',
      `The payment status for invoice ${details.invoiceNumber} for "${details.eventTitle}" is now ${details.status}.`,
      `Amount: ${details.currency} ${details.amount.toFixed(2)}`,
      '',
      statusMessage,
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
