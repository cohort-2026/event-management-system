import type { VendorApplication } from '@/types/vendor';

export function downloadInvoicePdf(application: VendorApplication) {
  const invoice = application.invoice;
  if (!invoice) throw new Error('No invoice is available for this application.');

  const amount = Number(invoice.amount);
  const taxRate = Number(invoice.taxRate);
  const taxAmount = Number(invoice.taxAmount);
  const areaSqm = Number(application.standAreaSqm);
  const ratePerSqm = Number(application.standRatePerSqm);
  const tablesAndChairsAmount = Number(application.tablesAndChairsAmount);
  const extensionCordAmount = Number(application.extensionCordAmount);
  if (![amount, taxRate, taxAmount, areaSqm, ratePerSqm, tablesAndChairsAmount, extensionCordAmount].every(Number.isFinite)) {
    throw new Error('The invoice amount or stand pricing is invalid.');
  }
  const addOns = [
    { description: 'Tables and chairs - 20 chairs, 4 tables', amount: tablesAndChairsAmount },
    { description: 'Extension cord - 10 m', amount: extensionCordAmount },
  ].filter(item => item.amount > 0);
  const shift = addOns.length * 18;

  const pdfText = (value: string) => value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
  const fit = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 3)}...` : value;
  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-ZA');
  };
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
  const headerBlue = '0.25 0.34 0.58';
  const paleBlue = '0.42 0.55 0.79';
  const issuer = 'EventMS Event Organizer';
  const vendor = application.companyName || application.vendor?.vendorProfile?.businessName || 'Vendor';
  const eventTitle = application.event?.title ?? 'Event';
  const venue = application.event?.venue ?? 'Venue not provided';
  const eventDate = application.event?.date ? date(application.event.date) : 'Not specified';
  const currency = invoice.currency || 'ZAR';

  text(54, 724, issuer, 14, headerBlue);
  text(54, 707, 'Payment instructions: contact the event organizer.', 8);
  text(414, 724, 'INVOICE', 24, paleBlue);
  text(420, 705, 'DATE', 7);
  text(474, 705, date(invoice.issuedAt), 8);
  text(420, 691, 'INVOICE #', 7);
  text(474, 691, invoice.invoiceNumber, 8);
  text(420, 677, 'CUSTOMER ID', 7);
  text(474, 677, application.vendorId.slice(0, 8), 7);

  rect(54, 638, 250, 15, headerBlue);
  rect(316, 638, 242, 15, headerBlue);
  text(60, 643, 'BILL TO:', 8, '1 1 1');
  text(322, 643, 'SHIP TO:', 8, '1 1 1');
  text(58, 622, fit(vendor, 45), 8);
  text(58, 609, fit(application.vendor?.vendorProfile?.businessAddress || 'Address not provided', 48), 8);
  text(58, 596, fit(application.vendor?.email || '', 48), 8);
  if (application.vendor?.vendorProfile?.contactPhone) {
    text(58, 583, fit(`Phone: ${application.vendor.vendorProfile.contactPhone}`, 48), 8);
  }
  text(320, 622, fit(eventTitle, 42), 8);
  text(320, 609, fit(venue, 43), 8);
  text(320, 596, `Assigned stand: ${application.assignedStand ?? 'Pending'}`, 8);
  text(320, 583, `Stand date: ${eventDate}`, 8);

  rect(54, 550, 504, 16, headerBlue);
  text(60, 555, 'SALESPERSON', 7, '1 1 1');
  text(155, 555, 'P.O. #', 7, '1 1 1');
  text(231, 555, 'SHIP DATE', 7, '1 1 1');
  text(405, 555, 'SHIPPING VENUE', 7, '1 1 1');
  text(482, 555, 'TERMS', 7, '1 1 1');
  text(60, 537, 'Event organizer', 7);
  text(155, 537, invoice.invoiceNumber.slice(-10), 7);
  text(231, 537, eventDate, 7);
  text(405, 537, fit(venue, 13) || '-', 7);
  text(482, 537, 'Net 14', 7);
  [148, 224, 398, 475].forEach(x => line(x, 530, x, 566));
  line(54, 530, 558, 530);

  rect(54, 503, 504, 18, headerBlue);
  text(63, 509, 'ITEM #', 8, '1 1 1');
  text(133, 509, 'DESCRIPTION', 8, '1 1 1');
  text(365, 509, 'QTY', 8, '1 1 1');
  text(414, 509, 'UNIT PRICE', 8, '1 1 1');
  text(500, 509, 'TOTAL', 8, '1 1 1');
  text(60, 486, application.assignedStand ?? '-', 8);
  text(133, 486, fit(`${application.requestedStandType} stand - ${application.requestedStandSize}`, 45), 8);
  text(365, 486, `${areaSqm.toFixed(2)} sqm`, 8);
  text(414, 486, `${currency} ${ratePerSqm.toFixed(2)}`, 8);
  text(500, 486, `${currency} ${(Math.round(areaSqm * ratePerSqm * 100) / 100).toFixed(2)}`, 8);
  addOns.forEach((item, index) => {
    const y = 486 - (index + 1) * 18;
    text(133, y, item.description, 8);
    text(365, y, '1', 8);
    text(414, y, `${currency} ${item.amount.toFixed(2)}`, 8);
    text(500, y, `${currency} ${item.amount.toFixed(2)}`, 8);
  });
  line(54, 476 - shift, 558, 476 - shift);
  [124, 356, 407, 493].forEach(x => line(x, 476 - shift, x, 521));
  line(54, 521, 558, 521);

  rect(54, 450 - shift, 285, 16, '0.73 0.73 0.73');
  text(60, 455 - shift, 'Other Comments or Special Instructions', 8, '1 1 1');
  line(54, 394 - shift, 339, 394 - shift);
  line(54, 450 - shift, 54, 394 - shift);
  line(339, 450 - shift, 339, 394 - shift);
  text(60, 435 - shift, `Payment amount due: ${currency} ${amount.toFixed(2)}`, 8);
  text(60, 420 - shift, `Due date: ${date(invoice.dueAt)}`, 8);
  text(60, 405 - shift, `Payment reference: ${invoice.invoiceNumber}`, 8);
  text(365, 450 - shift, 'SUBTOTAL', 8);
  text(490, 450 - shift, `${currency} ${(amount - taxAmount).toFixed(2)}`, 8);
  line(358, 444 - shift, 558, 444 - shift);
  text(365, 427 - shift, `TAX (${taxRate}%)`, 8);
  text(490, 427 - shift, `${currency} ${taxAmount.toFixed(2)}`, 8);
  line(358, 421 - shift, 558, 421 - shift);
  rect(358, 393 - shift, 200, 20, '0.90 0.92 0.96');
  text(365, 400 - shift, 'TOTAL', 9);
  text(485, 400 - shift, `${currency} ${amount.toFixed(2)}`, 9, headerBlue);
  text(80, 372 - shift, 'Questions? Contact the event organizer.', 8);
  text(203, 356 - shift, 'Thank you for your business!', 11, headerBlue);
  text(164, 338 - shift, 'Payment instructions: contact the event organizer.', 8);
  line(54, 319 - shift, 558, 319 - shift, '0.35 0.35 0.35');

  text(270, 301 - shift, 'REMITTANCE', 10, headerBlue);
  text(54, 280 - shift, issuer, 12, headerBlue);
  text(54, 265 - shift, 'Contact the event organizer for payment instructions.', 8);
  text(395, 279 - shift, 'DATE', 7);
  text(450, 279 - shift, date(invoice.issuedAt), 8);
  text(395, 264 - shift, 'INVOICE #', 7);
  text(450, 264 - shift, invoice.invoiceNumber, 8);
  text(395, 249 - shift, 'CUSTOMER ID', 7);
  text(450, 249 - shift, application.vendorId.slice(0, 8), 7);
  text(330, 224 - shift, 'AMOUNT ENCLOSED', 8);
  line(430, 218 - shift, 558, 218 - shift);
  line(430, 241 - shift, 558, 241 - shift);
  line(430, 218 - shift, 430, 241 - shift);
  line(558, 218 - shift, 558, 241 - shift);
  text(54, 72, `Invoice ${invoice.invoiceNumber} | Due ${date(invoice.dueAt)}`, 7, '0.42 0.45 0.5');

  const drawingCommands = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${drawingCommands.length} >>\nstream\n${drawingCommands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber.replace(/[^a-z0-9-_]/gi, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
