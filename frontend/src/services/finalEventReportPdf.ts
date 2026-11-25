import type { FinalEventReport } from '@/types/eventReport';

const money = (value: number) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: string) => new Date(value).toLocaleString('en-ZA', { dateStyle: 'long', timeStyle: 'short' });
const clean = (value: string) => value.replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');

function createPdf(lines: string[]): Blob {
  const pageLines = Array.from({ length: Math.ceil(lines.length / 43) }, (_, page) => lines.slice(page * 43, (page + 1) * 43));
  const objects: string[] = [];
  const pageIds = pageLines.map((_, index) => 3 + index * 2);
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  pageLines.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const commands = ['BT', '/F1 10 Tf', '50 760 Td', '14 TL', ...page.flatMap((line, lineIndex) => [`(${clean(line)}) Tj`, ...(lineIndex < page.length - 1 ? ['T*'] : [])]), 'ET'].join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + pageLines.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
  });
  const fontId = 3 + pageLines.length * 2;
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadFinalEventReportPdf(report: FinalEventReport) {
  const lines = [
    'FINAL EVENT REPORT', report.event.title, `Generated: ${date(report.generatedAt)}`,
    `Event: ${date(report.event.startTime)} | ${report.event.venue} | ${report.event.eventType.replace('_', ' ')}`,
    `Category: ${report.event.category}`, `Organizer: ${report.event.organizer.organizationName || `${report.event.organizer.firstname} ${report.event.organizer.lastname}`}`,
    '', 'ATTENDANCE', `Ticket capacity: ${report.attendance.totalTicketCapacity}`,
    `Registered attendees: ${report.attendance.totalRegisteredAttendees}`, `Confirmed bookings: ${report.attendance.totalConfirmedBookings}`,
    `Cancellations: ${report.attendance.totalCancellations}`, `Checked in: ${report.attendance.totalAttendeesCheckedIn}`,
    `Attendance rate: ${report.attendance.attendanceRate}%`, `No shows: ${report.attendance.totalNoShows} (${report.attendance.noShowRate}%)`,
    '', 'CHECK-INS BY HOUR', ...(report.attendance.checkInsByHour.length ? report.attendance.checkInsByHour.map(row => `${row.label}: ${row.count}`) : ['No check-ins recorded']),
    '', 'VENDOR PARTICIPATION', `Applications: ${report.vendors.totalApplications} | Approved: ${report.vendors.approved} | Pending: ${report.vendors.pending} | Rejected: ${report.vendors.rejected}`,
    'Approved stand allocations:', ...(report.vendors.standAllocations.length ? report.vendors.standAllocations.map(row => `${row.companyName} | Stand ${row.stand || 'Not recorded'} | ${row.standSize}, ${row.areaSqm.toFixed(2)} m2 | ${money(row.quotedAmount)} | Invoice ${row.invoiceNumber || 'none'}`) : ['No stands allocated']),
    '', 'VENDOR INVOICES', `Issued: ${report.vendorInvoices.issuedCount} (${money(report.vendorInvoices.outstandingAmount)} outstanding)`,
    `Paid: ${report.vendorInvoices.paidCount} (${money(report.vendorInvoices.paidAmount)})`, `Voided: ${report.vendorInvoices.voidCount} (${money(report.vendorInvoices.voidAmount)})`,
    '', 'EVENT REVENUE', `Ticket revenue: ${money(report.revenue.ticketRevenue)} (simulated payments)`,
    `Paid vendor invoices: ${money(report.revenue.paidVendorRevenue)}`, `Total revenue: ${money(report.revenue.totalRevenue)}`,
    '', 'Budget and event expenses are not recorded in the system. Ticket payments are simulated.',
  ];
  const blob = createPdf(lines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.event.title.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'event'}-final-report.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
