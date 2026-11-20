import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from '@/components/layout/NotificationBell';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { useAuth } from '@/context/useAuth';
import { getMyApplications, getVendorEvents, getVendorProfile, type VendorEvent } from '@/services/vendorService';
import { downloadInvoicePdf } from '@/services/vendorInvoicePdf';
import type { VendorApplication, VendorProfile } from '@/types/vendor';

interface DashboardData {
  profile: VendorProfile;
  applications: VendorApplication[];
  events: VendorEvent[];
  loadedAt: number;
}

async function loadApplications(): Promise<VendorApplication[]> {
  const first = await getMyApplications({ page: 1, limit: 100 });
  const applications = [...first.data.data];
  for (let page = 2; page <= first.data.pagination.totalPages; page += 1) {
    const response = await getMyApplications({ page, limit: 100 });
    applications.push(...response.data.data);
  }
  return applications;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getVendorProfile(), loadApplications(), getVendorEvents({ limit: 2 })])
      .then(([profile, applications, events]) => {
        if (active) setData({ profile: profile.data.data, applications, events: events.data.data, loadedAt: Date.now() });
      })
      .catch(() => {
        if (active) setError('Unable to load your vendor dashboard. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [attempt]);

  const upcomingStands = data?.applications
    .filter(application => application.status === 'APPROVED' && application.event &&
      new Date(application.event.endTime ?? application.event.date).getTime() > data.loadedAt)
    .sort((first, second) =>
      new Date(first.event?.startTime ?? first.event?.date ?? '').getTime() -
      new Date(second.event?.startTime ?? second.event?.date ?? '').getTime()) ?? [];
  const underReview = data?.applications.filter(application => application.status === 'PENDING_REVIEW') ?? [];
  const outstanding = data?.applications.filter(application =>
    application.status === 'APPROVED' && application.invoice?.status === 'ISSUED') ?? [];
  const totals = new Map<string, number>();
  outstanding.forEach(application => {
    const invoice = application.invoice;
    if (invoice) totals.set(invoice.currency, (totals.get(invoice.currency) ?? 0) + Number(invoice.amount));
  });
  const totalDue = [...totals].map(([currency, amount]) => formatCurrency(amount, currency)).join(' / ') || formatCurrency(0);
  const nextDue = outstanding
    .map(application => application.invoice?.dueAt)
    .filter((date): date is string => Boolean(date))
    .sort()[0];
  const staffCount = data?.applications.reduce((count, application) =>
    count + (application.status === 'APPROVED' && application.invoice?.status === 'PAID'
      ? application.staffMembers?.length ?? 0
      : 0), 0) ?? 0;

  const downloadInvoice = (application: VendorApplication) => {
    setActionError('');
    try {
      downloadInvoicePdf(application);
    } catch {
      setActionError('Unable to download this invoice. Please try again.');
    }
  };

  return (
    <PageWrapper>
      <div className="vendor-dashboard-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar accountSubtitle={data?.profile.businessName || user?.email} />
          <div className="min-w-0 flex-1">
            <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-2">
                <VendorMenuButton />
                <span className="truncate text-[12px] font-semibold text-[#333]">Overview</span>
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-4 pb-8 pt-5 sm:px-6 lg:px-8">
              {loading ? (
                <p role="status" className="py-10 text-sm text-neutral-500">Loading your dashboard...</p>
              ) : error || !data ? (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <p>{error || 'Unable to load your vendor dashboard.'}</p>
                  <button type="button" onClick={() => {
                    setLoading(true);
                    setError('');
                    setAttempt(current => current + 1);
                  }} className="mt-3 rounded-md border border-rose-200 bg-white px-3 py-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">Try again</button>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="break-words text-3xl font-extrabold tracking-tight text-[#151515] sm:text-4xl">{data.profile.businessName || 'Business profile'}</h1>
                      <p className="mt-1 text-sm text-[#777]">
                        {data.profile.status === 'APPROVED' ? 'Approved vendor' : data.profile.status === 'PENDING_REVIEW' ? 'Profile under review' : data.profile.status === 'REJECTED' ? 'Profile needs attention' : 'Draft profile'}
                        {user && ` - ${user.firstname} ${user.lastname}`}
                      </p>
                    </div>
                    <Link to="/vendor/events" className="vendor-button inline-flex min-h-10 items-center gap-2 rounded-md bg-gradient-to-r from-[#171717] via-[#4d0019] to-[#800020] px-4 text-sm font-bold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">
                      <SearchIcon /> Find events
                    </Link>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatTile label="Upcoming stands" value={String(upcomingStands.length)} />
                    <StatTile label="Under review" value={String(underReview.length)} />
                    <StatTile label="To pay" value={totalDue} note={nextDue ? `Due ${formatDate(nextDue)}` : undefined} />
                    <StatTile label="Staff passes" value={String(staffCount)} />
                  </div>

                  {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
                  <section aria-labelledby="vendor-stands-heading">
                    <h2 id="vendor-stands-heading" className="mb-2 text-lg font-extrabold">Your stands</h2>
                    {upcomingStands.length ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {upcomingStands.map(application => (
                          <StandCard key={application.id} application={application} onDownload={() => downloadInvoice(application)} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 text-sm text-[#777]">
                        No upcoming approved stands. <Link to="/vendor/applications" className="font-semibold text-rose-700 underline">View applications</Link>
                      </div>
                    )}
                  </section>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
                      <h2 className="mb-3 text-lg font-extrabold">Under review</h2>
                      {underReview.length ? underReview.slice(0, 3).map(application => (
                        <Link key={application.id} to="/vendor/applications" className="flex items-center gap-3 rounded-md py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#800020]">
                          <span className="h-10 w-10 shrink-0 rounded-md bg-gradient-to-br from-[#ac3cff] via-[#d64aa3] to-[#6b57db]" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{application.event?.title ?? 'Event'}</span>
                            <span className="block text-sm text-[#777]">{application.requestedStandSize} - {formatCurrency(Number(application.quotedAmount))} quote</span>
                          </span>
                          <span className="shrink-0 rounded-full border border-[#ffc66d] px-2 py-1 text-xs font-semibold text-[#bf6a00]">Applied</span>
                        </Link>
                      )) : <p className="text-sm text-[#777]">No applications under review.</p>}
                    </section>

                    <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
                      <h2 className="mb-3 text-lg font-extrabold">Looking for vendors</h2>
                      {data.events.length ? data.events.map(event => (
                        <Link key={event.id} to={`/events/${event.id}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#800020]">
                          <span className="min-w-0 break-words">{event.title} - {formatDate(event.startTime)}</span>
                          <span className="shrink-0 font-bold text-[#138a61]">{event.availableVendorStands} stands left</span>
                        </Link>
                      )) : <p className="text-sm text-[#777]">No events with available stands right now.</p>}
                    </section>
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#e5e5e5] bg-white p-4">
      <p className="text-sm font-medium text-[#555]">{label}</p>
      <p className="mt-1 break-words text-2xl font-extrabold leading-tight">{value}</p>
      {note && <p className="mt-1 text-xs font-semibold text-[#c54821]">{note}</p>}
    </div>
  );
}

function StandCard({ application, onDownload }: { application: VendorApplication; onDownload: () => void }) {
  const paid = application.invoice?.status === 'PAID';
  const stages = ['Applied', 'Allocated', paid ? 'Paid' : application.invoice?.status === 'VOID' ? 'Invoice void' : 'Pay invoice', 'Staff passes'];
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
      <div className="relative flex min-h-16 items-center justify-between gap-3 overflow-hidden bg-gradient-to-r from-[#171717] via-[#4d0019] to-[#800020] px-4 py-3 text-white">
        <span className="absolute -right-4 -top-10 h-24 w-24 rounded-full bg-white/20" aria-hidden="true" />
        <h3 className="relative min-w-0 break-words text-base font-extrabold text-white">{application.event?.title ?? 'Event'}</h3>
        {application.assignedStand && <span className="relative shrink-0 rounded bg-white px-2 py-1 text-sm font-extrabold text-[#252525]">{application.assignedStand}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-sm text-[#777]">{application.event ? `${formatDate(application.event.startTime ?? application.event.date)} - ${application.event.venue}` : 'Event details unavailable'}</p>
        <div className="grid grid-cols-4 gap-1">
          {stages.map((stage, index) => {
            const completed = index < 2 || (paid && index >= 2);
            return (
              <div key={stage} className="flex min-w-0 flex-col items-center gap-1 text-center">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${completed ? (index === 3 ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[#222] bg-[#222] text-white') : index === 2 ? 'border-orange-500 text-orange-600' : 'border-neutral-300 text-neutral-400'}`}>
                  {completed ? '✓' : index + 1}
                </span>
                <span className={`text-xs ${!completed && index === 2 ? 'font-bold text-orange-700' : 'text-neutral-500'}`}>{stage}</span>
              </div>
            );
          })}
        </div>
        <div className={`mt-auto flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${paid ? 'border-[#c6f2de] bg-[#edfff7]' : 'border-[#ffe3a2] bg-[#fffaf0]'}`}>
          <span className="min-w-0 break-words font-semibold">
            {application.invoice
              ? `${application.invoice.invoiceNumber} - ${paid ? 'Paid' : application.invoice.status === 'VOID' ? 'Void' : `${formatCurrency(Number(application.invoice.amount), application.invoice.currency)} - due ${formatDate(application.invoice.dueAt)}`}`
              : 'Invoice not available'}
          </span>
          {paid ? (
            <Link to={`/vendor/applications/${application.id}/staff`} className="vendor-button rounded border border-[#d8d8d8] bg-white px-3 py-1.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">Manage staff</Link>
          ) : application.invoice && (
            <button type="button" onClick={onDownload} className="rounded border border-[#d8d8d8] bg-white px-3 py-1.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">Download PDF</button>
          )}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function formatCurrency(value: number, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(value);
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}
