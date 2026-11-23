import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from '@/components/layout/NotificationBell';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { useAuth } from '@/context/useAuth';
import { getNotifications } from '@/services/notificationService';
import { getAllMyApplications, getVendorProfile } from '@/services/vendorService';
import { downloadInvoicePdf } from '@/services/vendorInvoicePdf';
import type { VendorApplication, VendorProfile } from '@/types/vendor';

interface DashboardData {
  profile: VendorProfile;
  applications: VendorApplication[];
  loadedAt: number;
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getVendorProfile(), getAllMyApplications()])
      .then(([profile, applications]) => {
        if (active) setData({ profile: profile.data.data, applications, loadedAt: Date.now() });
      })
      .catch(() => {
        if (active) setError('Unable to load your vendor dashboard. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (data?.profile.status !== 'APPROVED') return;
    let active = true;
    getNotifications()
      .then(response => { if (active) setUnreadNotifications(response.data.unreadCount); })
      .catch(() => { if (active) setUnreadNotifications(null); });
    return () => { active = false; };
  }, [data?.profile.status]);

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
                <span className="vendor-page-title truncate text-[12px] font-extrabold text-[#333]">Overview</span>
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
                  <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="min-w-0">
                      <h2 className="vendor-welcome-title text-lg font-extrabold text-slate-950">Welcome back, {user?.firstname || 'there'}!</h2>
                      <p className="mt-1 text-sm text-slate-600">Manage your business and discover new event opportunities.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.profile.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : data.profile.status === 'PENDING_REVIEW' ? 'bg-sky-50 text-sky-700' : data.profile.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                      {data.profile.status === 'APPROVED' ? 'Approved vendor' : data.profile.status === 'PENDING_REVIEW' ? 'Under review' : data.profile.status === 'REJECTED' ? 'Profile needs attention' : 'Profile incomplete'}
                    </span>
                  </section>

                  <section aria-labelledby="vendor-stats-heading" className="mb-5">
                    <h2 id="vendor-stats-heading" className="vendor-dashboard-section-title mb-2 text-base font-extrabold text-slate-900">Dashboard statistics</h2>
                    <div className="grid grid-cols-2 gap-3">
                    <StatTile icon="stands" label="Upcoming stands" value={String(upcomingStands.length)} />
                    <StatTile icon="review" label="Under review" value={String(underReview.length)} />
                    <StatTile icon="payments" label="Outstanding payments" value={totalDue} note={nextDue ? `Due ${formatDate(nextDue)}` : undefined} />
                    <StatTile icon="passes" label="Staff passes" value={String(staffCount)} />
                    </div>
                  </section>

                  {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
                  <section aria-labelledby="vendor-stands-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4">
                      <h2 id="vendor-stands-heading" className="vendor-dashboard-section-title text-base font-extrabold text-slate-900">Your upcoming stands</h2>
                      <p className="mt-1 text-sm text-slate-600">Approved events and stand details.</p>
                    </div>
                    {upcomingStands.length ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {upcomingStands.map(application => (
                          <StandCard key={application.id} application={application} onDownload={() => downloadInvoice(application)} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                        <CalendarIcon />
                        <p className="mt-2 text-sm font-bold text-slate-800">No upcoming stands</p>
                        <p className="mt-1 text-xs text-slate-500">Explore events to get started.</p>
                      </div>
                    )}
                  </section>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h2 className="vendor-dashboard-section-title text-base font-extrabold text-slate-900">Recent applications</h2>
                      <p className="mt-1 text-xs text-slate-500">Track your applications.</p>
                      {data.applications.length ? data.applications.slice(0, 3).map(application => (
                        <Link key={application.id} to="/vendor/applications" className="flex items-center gap-3 rounded-md py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#800020]">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{application.event?.title ?? 'Event'}</span>
                            <span className="block text-xs text-slate-500">{application.requestedStandSize} · {formatCurrency(Number(application.quotedAmount))} quote</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{formatStatus(application.status)}</span>
                        </Link>
                      )) : <p className="mt-3 text-sm text-slate-500">No recent activity.</p>}
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h2 className="vendor-dashboard-section-title text-base font-extrabold text-slate-900">Notifications</h2>
                      <p className="mt-1 text-xs text-slate-500">Stay up to date.</p>
                      <p className="mt-3 text-sm text-slate-600">{data.profile.status !== 'APPROVED' ? 'Notifications will be available after approval.' : unreadNotifications === null ? 'Your latest updates and reminders.' : unreadNotifications === 0 ? 'No new notifications.' : `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}.`}</p>
                      {data.profile.status === 'APPROVED' && <Link to="/vendor/notifications" className="mt-2 inline-block text-xs font-semibold text-rose-700 hover:underline">Open notifications</Link>}
                    </section>
                  </div>

                  <Link to="/vendor/events?stands=available" className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/30 sm:p-5">
                    <span>
                      <span className="vendor-dashboard-section-title block text-base font-extrabold text-slate-900">Discover events</span>
                      <span className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-800"><SearchIcon /> Find your next opportunity</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Browse events with available stands.</span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-slate-500">→</span>
                  </Link>
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatTile({ icon, label, value, note }: { icon: 'stands' | 'review' | 'payments' | 'passes'; label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#e5e5e5] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#555]">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
          <StatIcon name={icon} />
        </span>
      </div>
      <p className="mt-1 break-words text-2xl font-extrabold leading-tight">{value}</p>
      {note && <p className="mt-1 text-xs font-semibold text-[#c54821]">{note}</p>}
    </div>
  );
}

function StatIcon({ name }: { name: 'stands' | 'review' | 'payments' | 'passes' }) {
  const paths = {
    stands: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path strokeLinecap="round" d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01" /></>,
    review: <><circle cx="12" cy="12" r="8.5" /><path strokeLinecap="round" d="M12 7v5l3.5 2" /></>,
    payments: <><circle cx="12" cy="12" r="8.5" /><path strokeLinecap="round" d="M15.5 9.5c-.6-.8-1.6-1.2-3-1.2-1.5 0-2.5.7-2.5 1.8 0 2.8 5.5 1 5.5 4 0 1.2-1.1 2-2.8 2-1.4 0-2.5-.5-3.2-1.4M12 6.5v11" /></>,
    passes: <><circle cx="9" cy="8" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0-1.1-5.8M16 14a5 5 0 0 1 4.5 5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
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

function formatStatus(status: string) {
  return status.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-500" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path strokeLinecap="round" d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}
