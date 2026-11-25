import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { getFinalEventReport } from '@/services/eventService';
import { downloadFinalEventReportPdf } from '@/services/finalEventReportPdf';
import type { FinalEventReport } from '@/types/eventReport';

const money = (value: number): string => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value: string): string => new Date(value).toLocaleString('en-ZA', { dateStyle: 'long', timeStyle: 'short' });

function Kpi({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="min-h-28 rounded-xl bg-[#252525] p-5">
      <p className="text-sm font-medium text-[#c5c3bf]">{label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-[#f2f1ef]">{value}</p>
      {note && <p className="mt-1 text-xs text-[#96948f]">{note}</p>}
    </div>
  );
}

function CheckInChart({ rows }: { rows: FinalEventReport['attendance']['checkInsByHour'] }) {
  const width = 900;
  const height = 300;
  const plot = { left: 48, top: 18, right: 16, bottom: 44 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const maxValue = Math.max(4, ...rows.map(row => row.count));
  const tickStep = Math.max(1, Math.ceil(maxValue / 4));
  const topTick = Math.ceil(maxValue / tickStep) * tickStep;
  const ticks = Array.from({ length: Math.floor(topTick / tickStep) + 1 }, (_, index) => index * tickStep);
  const bandWidth = rows.length ? plotWidth / rows.length : plotWidth;
  const barWidth = Math.min(42, bandWidth * 0.48);

  return (
    <section aria-labelledby="checkins-by-hour-title" className="rounded-xl bg-[#191919]">
      <h2 id="checkins-by-hour-title" className="text-lg font-semibold text-[#ecebe8]">Check-ins by hour</h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-[#bdbbb6]"><span className="inline-block h-3.5 w-3.5 rounded-sm bg-[#3478d1]" />Guests checked in</p>
      {rows.length === 0 ? (
        <p className="mt-5 rounded-lg bg-[#252525] p-5 text-sm text-[#aaa8a2]">No attendees were checked in for this event.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="block w-full min-w-[620px]" role="img" aria-label="Attendee check-ins by local hour">
            {ticks.map(tick => {
              const y = plot.top + plotHeight - tick / topTick * plotHeight;
              return <g key={tick}><line x1={plot.left} y1={y} x2={width - plot.right} y2={y} stroke="#383838" /><text x={plot.left - 8} y={y + 4} textAnchor="end" fill="#8f8d88" fontSize="13">{tick}</text></g>;
            })}
            {rows.map((row, index) => {
              const barHeight = row.count / topTick * plotHeight;
              const x = plot.left + bandWidth * index + (bandWidth - barWidth) / 2;
              const y = plot.top + plotHeight - barHeight;
              return (
                <g key={row.hour}>
                  <rect x={x} y={y} width={barWidth} height={Math.max(1, barHeight)} rx="5" fill="#3478d1"><title>{`${row.label}: ${row.count} check-ins`}</title></rect>
                  <text x={x + barWidth / 2} y={height - 14} textAnchor="middle" fill="#8f8d88" fontSize="13">{row.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <p className="mt-1 text-xs text-[#85837e]">Check-in times shown in South Africa time.</p>
    </section>
  );
}

export default function OrganizerEventFinalReportDashboard() {
  const { id = '' } = useParams<{ id: string }>();
  const [report, setReport] = useState<FinalEventReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getFinalEventReport(id)
      .then(response => { if (active) setReport(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data?.message ?? 'The final event report could not be loaded.'
          : 'The final event report could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader title="Final event report" topBarSubtitle="Completed event performance." showNavigation={false} />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link to="/organizer/reports" className="text-sm font-semibold text-neutral-700 hover:text-neutral-950">← Back to reports</Link>
            {report && <Button type="button" variant="secondary" onClick={() => downloadFinalEventReportPdf(report)}>Download PDF</Button>}
          </div>
          {loading ? (
            <div role="status" className="flex items-center gap-3 py-12 text-neutral-700"><Spinner /> Loading final report…</div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</div>
          ) : report ? (
            <main className="space-y-6 rounded-2xl bg-[#191919] p-4 text-white sm:p-6 print:bg-white print:text-black">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#66bd8a]">Final event report · completed</p>
                  <h1 className="mt-1 text-2xl font-bold text-[#f2f1ef] print:text-black">{report.event.title}</h1>
                  <p className="mt-2 text-sm text-[#bdbbb6] print:text-neutral-700">{formatDate(report.event.startTime)} · {report.event.venue} · {report.event.eventType.replace('_', ' ').toLowerCase()}</p>
                  <p className="mt-1 text-xs text-[#96948f] print:text-neutral-600">{report.event.category} · Organizer: {report.event.organizer.organizationName || `${report.event.organizer.firstname} ${report.event.organizer.lastname}`}</p>
                </div>
                <p className="text-xs text-[#96948f] print:text-neutral-600">Generated {formatDate(report.generatedAt)}</p>
              </header>

              <section aria-label="Event performance summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Registered" value={report.attendance.totalRegisteredAttendees} note={`${report.attendance.totalConfirmedBookings} confirmed bookings`} />
                <Kpi label="Attended" value={report.attendance.totalAttendeesCheckedIn} note="Tickets checked in" />
                <Kpi label="Attendance rate" value={`${report.attendance.attendanceRate}%`} note="Of non-cancelled tickets" />
                <Kpi label="Satisfaction" value="N/A" note="No attendee satisfaction ratings are recorded" />
              </section>

              <CheckInChart rows={report.attendance.checkInsByHour} />

              <section aria-labelledby="capacity-bookings-title">
                <h2 id="capacity-bookings-title" className="mb-3 text-lg font-semibold text-[#ecebe8]">Registration and attendance</h2>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  <Kpi label="Ticket capacity" value={report.attendance.totalTicketCapacity} />
                  <Kpi label="Confirmed bookings" value={report.attendance.totalConfirmedBookings} />
                  <Kpi label="Cancellations" value={report.attendance.totalCancellations} />
                  <Kpi label="Waitlisted" value={report.attendance.totalWaitlistedAttendees} note="Waitlist tracking unavailable" />
                  <Kpi label="Checked in" value={report.attendance.totalAttendeesCheckedIn} />
                  <Kpi label="No-shows" value={report.attendance.totalNoShows} note={`${report.attendance.noShowRate}% of valid tickets`} />
                </dl>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-xl bg-[#252525] p-5">
                  <h2 className="text-lg font-semibold text-[#ecebe8]">Vendor participation</h2>
                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Kpi label="Applications" value={report.vendors.totalApplications} />
                    <Kpi label="Approved" value={report.vendors.approved} />
                    <Kpi label="Pending" value={report.vendors.pending} />
                    <Kpi label="Rejected" value={report.vendors.rejected} />
                  </dl>
                  <h3 className="mt-5 font-semibold text-[#dedcd7]">Stand allocations</h3>
                  {report.vendors.standAllocations.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-[#191919] p-4 text-sm text-[#aaa8a2]">No stands were allocated for this event.</p>
                  ) : (
                    <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-[#3b3b3b]">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="sticky top-0 bg-[#303030] text-xs uppercase tracking-wide text-[#aaa8a2]"><tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Stand</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Quote</th></tr></thead>
                        <tbody className="divide-y divide-[#383838] text-[#dedcd7]">
                          {report.vendors.standAllocations.map((allocation, index) => (
                            <tr key={`${allocation.invoiceNumber ?? allocation.email}-${index}`}>
                              <td className="px-3 py-3"><span className="font-semibold">{allocation.companyName}</span><span className="mt-0.5 block text-xs text-[#96948f]">{allocation.contactName}</span></td>
                              <td className="px-3 py-3 font-semibold">{allocation.stand || 'Not recorded'}</td>
                              <td className="px-3 py-3">{allocation.standSize} · {allocation.areaSqm.toFixed(2)} m²</td>
                              <td className="px-3 py-3">{money(allocation.quotedAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <section className="rounded-xl bg-[#252525] p-5">
                    <h2 className="text-lg font-semibold text-[#ecebe8]">Vendor invoices and payments</h2>
                    <dl className="mt-3 space-y-3 text-sm text-[#c5c3bf]">
                      <div className="flex justify-between gap-3"><dt>Issued · outstanding</dt><dd className="font-semibold text-white">{report.vendorInvoices.issuedCount} · {money(report.vendorInvoices.outstandingAmount)}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Paid</dt><dd className="font-semibold text-white">{report.vendorInvoices.paidCount} · {money(report.vendorInvoices.paidAmount)}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Voided</dt><dd className="font-semibold text-white">{report.vendorInvoices.voidCount} · {money(report.vendorInvoices.voidAmount)}</dd></div>
                    </dl>
                    <h3 className="mt-5 font-semibold text-[#dedcd7]">Invoice details</h3>
                    <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-[#3b3b3b]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#303030] text-[#aaa8a2]"><tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th></tr></thead>
                        <tbody className="divide-y divide-[#383838] text-[#dedcd7]">
                          {report.vendors.standAllocations.filter(allocation => allocation.invoiceNumber).map(allocation => (
                            <tr key={allocation.invoiceNumber}><td className="px-3 py-2">{allocation.companyName}</td><td className="px-3 py-2">{allocation.invoiceNumber}</td><td className="px-3 py-2">{money(allocation.quotedAmount)}</td><td className="px-3 py-2">{allocation.invoiceStatus}</td></tr>
                          ))}
                          {report.vendors.standAllocations.every(allocation => !allocation.invoiceNumber) && <tr><td colSpan={4} className="px-3 py-4 text-center text-[#96948f]">No vendor invoices were issued.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-xl bg-[#252525] p-5">
                    <h2 className="text-lg font-semibold text-[#ecebe8]">Event revenue</h2>
                    <p className="mt-3 text-3xl font-semibold text-[#f2f1ef]">{money(report.revenue.totalRevenue)}</p>
                    <dl className="mt-3 space-y-2 text-sm text-[#c5c3bf]">
                      <div className="flex justify-between gap-3"><dt>Paid ticket revenue</dt><dd>{money(report.revenue.ticketRevenue)}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Paid vendor invoices</dt><dd>{money(report.revenue.paidVendorRevenue)}</dd></div>
                    </dl>
                    <p className="mt-3 text-xs text-[#96948f]">Ticket payments are simulated here. Revenue includes paid ticket transactions and paid vendor invoices only.</p>
                  </section>

                  <section className="rounded-xl bg-[#252525] p-5">
                    <h2 className="text-lg font-semibold text-[#ecebe8]">Budget vs actual spend (R thousand)</h2>
                    <p className="mt-3 flex gap-4 text-sm text-[#bdbbb6]"><span><i className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#3478d1]" />Budget</span><span><i className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#ed7044]" />Actual</span></p>
                    <p className="mt-4 rounded-lg bg-[#191919] p-4 text-sm text-[#aaa8a2]">Budget and event expenses are not recorded in the system, so spend comparisons are unavailable.</p>
                  </section>
                </div>
              </section>

              <footer className="border-t border-[#383838] pt-4 text-xs text-[#96948f]">Final figures are read together from one consistent database snapshot. Checked-in and no-show figures count issued tickets, not bookings.</footer>
            </main>
          ) : null}
        </section>
      </div>
    </PageWrapper>
  );
}
