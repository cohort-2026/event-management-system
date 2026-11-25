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
  taxRate: number;
  taxAmount: number;
  dueAt: Date;
  assignedStand: string;
  requestedStandType: string;
  requestedStandSize: string;
  areaSqm: number;
  ratePerSqm: number;
  tablesAndChairsAmount: number;
  extensionCordAmount: number;
}): Promise<void> => {
  const addOns = [
    { description: 'Tables and chairs - 20 chairs, 4 tables', amount: details.tablesAndChairsAmount },
    { description: 'Extension cord - 10 m', amount: details.extensionCordAmount },
  ].filter(item => item.amount > 0);
  const shift = addOns.length * 18;
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
  text(190, 555, 'P.O. #', 7, '1 1 1');
  text(285, 555, 'EVENT DATE', 7, '1 1 1');
  text(385, 555, 'F.O.B.', 7, '1 1 1');
  text(475, 555, 'TERMS', 7, '1 1 1');
  text(60, 537, issuerName.slice(0, 17), 7);
  text(190, 537, details.invoiceNumber.slice(-10), 7);
  text(285, 537, date(details.eventDate), 7);
  text(385, 537, fit(details.venue, 13) || '-', 7);
  text(475, 537, 'Net 14', 7);
  [180, 275, 375, 465].forEach(x => line(x, 530, x, 566));
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
  text(500, 486, `ZAR ${(Math.round(details.areaSqm * details.ratePerSqm * 100) / 100).toFixed(2)}`, 8);
  addOns.forEach((item, index) => {
    const y = 486 - (index + 1) * 18;
    text(133, y, item.description, 8);
    text(365, y, '1', 8);
    text(414, y, `ZAR ${item.amount.toFixed(2)}`, 8);
    text(500, y, `ZAR ${item.amount.toFixed(2)}`, 8);
  });
  line(54, 476 - shift, 558, 476 - shift);
  [124, 356, 407, 493].forEach(x => line(x, 476 - shift, x, 521));
  line(54, 521, 558, 521);

  // Comments and totals.
  rect(54, 450 - shift, 285, 16, '0.73 0.73 0.73');
  text(60, 455 - shift, 'Other Comments or Special Instructions', 8, '1 1 1');
  line(54, 394 - shift, 339, 394 - shift);
  line(54, 450 - shift, 54, 394 - shift);
  line(339, 450 - shift, 339, 394 - shift);
  text(60, 435 - shift, `Payment amount due: ZAR ${details.amount.toFixed(2)}`, 8);
  text(60, 420 - shift, `Due date: ${date(details.dueAt)}`, 8);
  text(60, 405 - shift, `Payment reference: ${details.invoiceNumber}`, 8);
  text(365, 450 - shift, 'SUBTOTAL', 8);
  text(490, 450 - shift, `ZAR ${(details.amount - details.taxAmount).toFixed(2)}`, 8);
  line(358, 444 - shift, 558, 444 - shift);
  text(365, 427 - shift, `TAX (${details.taxRate}%)`, 8);
  text(490, 427 - shift, `ZAR ${details.taxAmount.toFixed(2)}`, 8);
  line(358, 421 - shift, 558, 421 - shift);
  rect(358, 393 - shift, 200, 20, '0.90 0.92 0.96');
  text(365, 400 - shift, 'TOTAL', 9);
  text(485, 400 - shift, `ZAR ${details.amount.toFixed(2)}`, 9, headerBlue);
  text(80, 372 - shift, `Questions? Contact ${issuerName} at ${details.issuerEmail || 'the event organizer'}.`, 8);
  text(203, 356 - shift, 'Thank you for your business!', 11, headerBlue);
  text(164, 338 - shift, `Payment instructions: contact ${details.issuerEmail || 'the event organizer'}.`, 8);
  line(54, 319 - shift, 558, 319 - shift, '0.35 0.35 0.35');

  // Remittance stub.
  text(270, 301 - shift, 'REMITTANCE', 10, headerBlue);
  text(54, 280 - shift, fit(issuerName, 42), 12, headerBlue);
  text(54, 265 - shift, fit(details.issuerEmail || 'Address not provided', 48), 8);
  if (details.issuerPhone) text(54, 252 - shift, fit(`Phone: ${details.issuerPhone}`, 48), 8);
  text(395, 279 - shift, 'DATE', 7);
  text(450, 279 - shift, date(details.issuedAt), 8);
  text(395, 264 - shift, 'INVOICE #', 7);
  text(450, 264 - shift, details.invoiceNumber, 8);
  text(395, 249 - shift, 'CUSTOMER ID', 7);
  text(450, 249 - shift, details.customerId, 7);
  text(330, 224 - shift, 'AMOUNT ENCLOSED', 8);
  line(430, 218 - shift, 558, 218 - shift);
  line(430, 241 - shift, 558, 241 - shift);
  line(430, 218 - shift, 430, 241 - shift);
  line(558, 218 - shift, 558, 241 - shift);
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
      ...addOns.map(item => `${item.description}: ZAR ${item.amount.toFixed(2)}`),
      `Subtotal: ZAR ${(details.amount - details.taxAmount).toFixed(2)}`,
      `Tax (${details.taxRate}%): ZAR ${details.taxAmount.toFixed(2)}`,
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
