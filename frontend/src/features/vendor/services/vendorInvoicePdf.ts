import type { VendorApplication } from '@/types/vendor';

export function downloadInvoicePdf(application: VendorApplication) {
  const invoice = application.invoice;
  if (!invoice) throw new Error('No invoice is available for this application.');

  const amount = Number(invoice.amount);
  if (!Number.isFinite(amount)) throw new Error('The invoice amount is invalid.');
  const dateLabel = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-ZA');
  };
  const sourceLines = [
    `Invoice number: ${invoice.invoiceNumber}`,
    `Vendor: ${application.companyName}`,
    `Event: ${application.event?.title ?? 'Event'}`,
    `Venue: ${application.event?.venue ?? 'Not specified'}`,
    `Assigned stand: ${application.assignedStand ?? 'Pending'}`,
    `Issued: ${dateLabel(invoice.issuedAt)}`,
    `Due: ${dateLabel(invoice.dueAt)}`,
    '',
    'Description: Vendor stand reservation',
    `Total: ${invoice.currency} ${amount.toFixed(2)}`,
    `Status: ${invoice.status}`,
  ];
  const pdfText = (value: string) => value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
  const lines = sourceLines.flatMap(line => {
    const safeLine = line.replace(/[^\x20-\x7E]/g, '?');
    if (!safeLine) return [''];
    const wrapped: string[] = [];
    for (let offset = 0; offset < safeLine.length; offset += 82) wrapped.push(safeLine.slice(offset, offset + 82));
    return wrapped;
  });
  const drawingCommands = [
    'BT',
    '/F1 20 Tf',
    '50 760 Td',
    '(INVOICE) Tj',
    '/F1 11 Tf',
    ...lines.map((line, index) => `${index === 0 ? '0 -30 Td' : '0 -18 Td'} (${pdfText(line)}) Tj`),
    'ET',
  ].join('\n');
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
