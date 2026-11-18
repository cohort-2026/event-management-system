import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { getMyApplications } from '@/services/vendorService';
import type { VendorApplication } from '@/types/vendor';

type ApplicationTab = 'active' | 'past' | 'rejected';

const pageLoadTime = Date.now();

export default function MyApplications() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<ApplicationTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then(response => {
        if (!active) return;
        const loadedApplications = response.data.data;
        setApplications(loadedApplications);
        setExpandedApplicationId(loadedApplications.find(application => application.assignedStand)?.id ?? null);
      })
      .catch(() => { if (active) setError('Unable to load your applications. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const applicationGroups = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const matchingApplications = query
      ? applications.filter(application => [
        application.event?.title,
        application.event?.venue,
        application.requestedStandType,
        application.requestedStandSize,
        application.assignedStand,
        application.status,
        application.invoice?.invoiceNumber,
        application.rejectionReason,
        ...(application.staffMembers?.flatMap(member => [member.name, member.email]) ?? []),
      ].some(value => value?.toLocaleLowerCase().includes(query)))
      : applications;

    return {
      active: matchingApplications.filter(application =>
        application.status !== 'REJECTED' && !isEventInPast(application, pageLoadTime),
      ),
      past: matchingApplications.filter(application =>
        application.status !== 'REJECTED' && isEventInPast(application, pageLoadTime),
      ),
      rejected: matchingApplications.filter(application => application.status === 'REJECTED'),
    };
  }, [applications, searchQuery]);

  const visibleApplications = applicationGroups[selectedTab];

  return (
    <PageWrapper>
      <div className="vendor-dashboard-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-2">
                <VendorMenuButton />
                <span className="truncate text-[12px] font-semibold text-[#333]">My applications</span>
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField value={searchQuery} onChange={setSearchQuery} />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-3.5 pb-4 pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-[22px] font-extrabold leading-7 tracking-tight text-[#151515]">My applications</h1>
                </div>
                <Link
                  to="/vendor/events"
                  className="inline-flex h-[17px] items-center rounded-md bg-gradient-to-r from-[#ed1744] to-[#ff6a00] px-2 text-[11px] font-bold text-white shadow-sm transition hover:brightness-95"
                >
                  Find events
                </Link>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-1" role="tablist" aria-label="Application history">
                {([
                  ['active', 'Active'],
                  ['past', 'Past'],
                  ['rejected', 'Rejected'],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selectedTab === tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`rounded-md border px-1.5 py-0.5 text-[11px] font-bold transition ${
                      selectedTab === tab
                        ? 'border-[#f15a2a] bg-[#fff1ea] text-[#c54821]'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {label} <span className="ml-0.5 opacity-70">{applicationGroups[tab].length}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500" role="status">
                  Loading applications…
                </div>
              ) : error ? (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p>
              ) : applications.length === 0 ? (
                <EmptyApplications />
              ) : searchQuery.trim() && !Object.values(applicationGroups).some(group => group.length > 0) ? (
                <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center">
                  <p className="text-[12px] font-bold text-[#333]">No matching applications</p>
                  <p className="mt-1 text-[11px] text-[#777]">Try another event, stand, invoice, or staff name.</p>
                </div>
              ) : visibleApplications.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
                  <p className="text-xs font-bold text-slate-800">No {selectedTab} applications</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {selectedTab === 'active'
                      ? 'New stand requests will appear here.'
                      : selectedTab === 'past'
                        ? 'Applications for completed events will appear here.'
                        : 'Rejected applications will appear here.'}
                  </p>
                </div>
              ) : (
                <>
                  {selectedTab === 'rejected' ? (
                    <div className="space-y-2">
                      {visibleApplications.map((application, index) => (
                        <RejectedApplication key={application.id} application={application} index={index} />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 md:hidden">
                        {visibleApplications.map((application, index) => (
                          <MobileApplicationCard
                            key={application.id}
                            application={application}
                            index={index}
                          />
                        ))}
                      </div>
                      <div className="hidden md:block">
                        <ApplicationsTable
                          applications={visibleApplications}
                          expandedApplicationId={expandedApplicationId}
                          onToggle={applicationId => setExpandedApplicationId(current =>
                            current === applicationId ? null : applicationId,
                          )}
                        />
                      </div>
                    </>
                  )}

                  {selectedTab === 'active' && applicationGroups.rejected.length > 0 && (
                    <section className="mt-2" aria-labelledby="rejected-applications-heading">
                      <div className="rounded-lg border border-[#e5e5e5] bg-white p-2">
                        <h2 id="rejected-applications-heading" className="mb-1 text-[11px] font-bold text-[#777]">
                          From the Rejected tab
                        </h2>
                        <div className="space-y-1">
                          {applicationGroups.rejected.slice(0, 1).map((application, index) => (
                            <RejectedApplication key={application.id} application={application} index={index} compact />
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function ApplicationsTable({
  applications,
  expandedApplicationId,
  onToggle,
}: {
  applications: VendorApplication[];
  expandedApplicationId: string | null;
  onToggle: (applicationId: string) => void;
}) {
  return (
    <section className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white" aria-label="Applications">
      <div className="min-w-[430px]">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(30px,.4fr)_minmax(38px,.55fr)_minmax(46px,.65fr)_minmax(70px,1fr)_minmax(48px,.65fr)] items-center gap-1 border-b border-[#ededed] bg-white px-2 py-1 text-[10px] font-bold text-[#777]">
          <span>Event</span>
          <span>Stand</span>
          <span>Quote</span>
          <span>Status</span>
          <span>Invoice</span>
          <span aria-hidden="true" />
        </div>

        <div>
          {applications.map((application, index) => (
            <ApplicationRow
              key={application.id}
              application={application}
              index={index}
              expanded={expandedApplicationId === application.id}
              onToggle={() => onToggle(application.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileApplicationCard({ application, index }: { application: VendorApplication; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const paid = application.invoice?.status === 'PAID';
  const pending = application.status === 'PENDING_REVIEW';

  return (
    <article className="rounded-lg border border-[#e5e5e5] bg-white p-3">
      <div className="flex min-w-0 items-start gap-2">
        <EventArtwork index={index} className="h-10 w-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-[#222]">{application.event?.title ?? 'Event'}</h2>
            <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${getStatusClass(application, paid)}`}>
              {getStatusLabel(application, paid)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {[application.event?.date && formatShortDate(application.event.date), application.requestedStandSize]
              .filter(Boolean)
              .join(' · ') || 'Date and stand size pending'}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">Stand</dt>
          <dd className="truncate font-semibold text-slate-700">{application.assignedStand ? `Stand ${application.assignedStand}` : 'Pending'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">Quote</dt>
          <dd className="truncate font-semibold text-slate-700">{formatCurrency(application.quotedAmount)}</dd>
        </div>
        <div className="col-span-2 min-w-0 border-t border-slate-200 pt-2">
          <dt className="text-xs text-slate-500">Invoice</dt>
          <dd className="truncate font-semibold text-slate-700">
            {application.invoice?.invoiceNumber ?? (pending ? 'After allocation' : 'Not issued')}
          </dd>
          {application.invoice && (
            <dd className={`text-xs ${paid ? 'text-emerald-700' : 'text-amber-700'}`}>
              {paid ? 'Paid' : application.invoice.status === 'VOID' ? 'Void' : `Unpaid · due ${formatShortDate(application.invoice.dueAt)}`}
            </dd>
          )}
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {application.assignedStand && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(current => !current)}
            className="mr-auto rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {expanded ? 'Hide details' : 'Application details'}
          </button>
        )}
        {paid ? (
          <Link
            to={`/vendor/applications/${application.id}/staff`}
            className="rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Staff passes
          </Link>
        ) : application.invoice && application.invoice.status !== 'VOID' ? (
          <button
            type="button"
            onClick={() => downloadInvoicePdf(application)}
            className="rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Download invoice
          </button>
        ) : pending ? (
          <button type="button" disabled title="Withdrawing applications is not available yet." className="rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-400">
            Withdraw
          </button>
        ) : null}
      </div>

      {application.assignedStand && expanded && (
        <div className="relative ml-3 mt-3 border-l border-[#d8d8d8] py-1 pl-3">
          <TimelineItem
            title={`Stand ${application.assignedStand} allocated`}
            detail={[
              application.decidedBy && `${application.decidedBy.firstname} ${application.decidedBy.lastname}`,
              application.invoice ? 'invoice emailed' : application.decidedAt && formatDateTime(application.decidedAt),
            ].filter(Boolean).join(' · ') || 'Approved'}
            completed
          />
          <TimelineItem
            title="Application sent"
            detail={[
              application.requestedStandSize,
              formatCurrency(application.quotedAmount),
              formatDateTime(application.createdAt),
            ].filter(Boolean).join(' · ')}
            completed
          />
        </div>
      )}
    </article>
  );
}

function ApplicationRow({
  application,
  index,
  expanded,
  onToggle,
}: {
  application: VendorApplication;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const paid = application.invoice?.status === 'PAID';
  const pending = application.status === 'PENDING_REVIEW';

  return (
    <article className="border-b border-slate-100 last:border-b-0">
      <div className="grid min-h-[32px] grid-cols-[minmax(0,2fr)_minmax(30px,.4fr)_minmax(38px,.55fr)_minmax(46px,.65fr)_minmax(70px,1fr)_minmax(48px,.65fr)] items-center gap-1 px-2 py-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 items-center gap-1.5 text-left"
        >
          <EventArtwork index={index} className="h-6 w-6 shrink-0 rounded-[4px]" />
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-bold leading-tight text-[#222]">
              {application.event?.title ?? 'Event'}
            </span>
            <span className="mt-0.5 block truncate text-[10px] leading-tight text-[#888]">
              {[application.event?.date && formatShortDate(application.event.date), application.requestedStandSize]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        </button>

        <span className="truncate text-[12px] font-semibold text-slate-600">
          {application.assignedStand ? `Stand ${application.assignedStand}` : '—'}
        </span>
        <span className="truncate text-[12px] font-bold text-slate-700">
          {formatCurrency(application.quotedAmount)}
        </span>
        <span className={`w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold ${getStatusClass(application, paid)}`}>
          {getStatusLabel(application, paid)}
        </span>

        <div className="flex min-w-0 flex-col items-start gap-0.5">
          {application.invoice ? (
            <>
              <span className="max-w-full truncate text-[11px] font-bold text-slate-700">
                {application.invoice.invoiceNumber}
              </span>
              <span className={`max-w-full truncate text-[10px] ${paid ? 'text-emerald-700' : 'text-[#d97706]'}`}>
                {paid
                  ? 'Paid'
                  : application.invoice.status === 'VOID'
                    ? 'Void'
                    : `Unpaid · due ${formatShortDate(application.invoice.dueAt)}`}
              </span>
            </>
          ) : pending ? (
            <>
              <span className="text-[11px] text-slate-500">After allocation</span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400">Not issued</span>
          )}
        </div>
        <div className="flex justify-end">
          {paid ? (
            <Link
              to={`/vendor/applications/${application.id}/staff`}
              className="whitespace-nowrap rounded border border-[#d8d8d8] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#444] hover:bg-slate-50"
            >
              Staff passes
            </Link>
          ) : application.invoice && application.invoice.status !== 'VOID' ? (
            <button
              type="button"
              onClick={() => downloadInvoicePdf(application)}
              className="whitespace-nowrap rounded border border-[#d8d8d8] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#444] hover:bg-slate-50"
            >
              Download
            </button>
          ) : pending ? (
            <button
              type="button"
              disabled
              title="Withdrawing applications is not available yet."
              className="whitespace-nowrap rounded border border-[#d8d8d8] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#444]"
            >
              Withdraw
            </button>
          ) : null}
        </div>
      </div>

      {application.assignedStand && expanded && (
        <div className="relative ml-[30px] border-l border-[#d8d8d8] py-1 pl-2">
          <TimelineItem
            title={`Stand ${application.assignedStand} allocated`}
            detail={[
              application.decidedBy && `${application.decidedBy.firstname} ${application.decidedBy.lastname}`,
              application.invoice ? 'invoice emailed' : application.decidedAt && formatDateTime(application.decidedAt),
            ].filter(Boolean).join(' · ') || 'Approved'}
            completed
          />
          <TimelineItem
            title="Application sent"
            detail={[
              application.requestedStandSize,
              formatCurrency(application.quotedAmount),
              formatDateTime(application.createdAt),
            ].filter(Boolean).join(' · ')}
            completed
          />
        </div>
      )}
    </article>
  );
}

function RejectedApplication({
  application,
  index,
  compact = false,
}: {
  application: VendorApplication;
  index: number;
  compact?: boolean;
}) {
  return (
    <article className={compact
      ? 'flex items-center gap-1.5'
      : 'flex items-start gap-2 rounded-lg border border-[#e5e5e5] bg-white p-2.5'
    }>
      <EventArtwork index={index + 3} className={compact ? 'h-6 w-6 shrink-0 rounded-[4px]' : 'h-8 w-9 shrink-0 rounded-md'} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-x-1.5 gap-y-0.5">
          <h3 className="truncate text-[12px] font-bold text-slate-800">{application.event?.title ?? 'Event'}</h3>
          {!compact && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Rejected</span>}
        </div>
        {compact ? (
          <p className="mt-0.5 truncate text-[10px] leading-tight text-rose-700">
            {application.rejectionReason ?? [
              application.event?.date && formatShortDate(application.event.date),
              application.requestedStandSize,
            ].filter(Boolean).join(' · ')}
          </p>
        ) : (
          <>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {[application.event?.date && formatShortDate(application.event.date), application.requestedStandSize]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {application.rejectionReason && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-rose-700">{application.rejectionReason}</p>
            )}
          </>
        )}
      </div>
      {compact ? (
        <span className="shrink-0 rounded-full border border-rose-200 px-1 py-0.5 text-[10px] font-bold leading-none text-rose-600">
          Rejected
        </span>
      ) : application.event && (
        <Link
          to={`/vendor/events/${application.event.id}/apply`}
          className="shrink-0 rounded-md border border-slate-200 px-1.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        >
          Revise
        </Link>
      )}
    </article>
  );
}

function TimelineItem({ title, detail, completed }: { title: string; detail: string; completed?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-1">
      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${completed ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold leading-tight text-slate-700">{title}</p>
        <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function EventArtwork({ index, className }: { index: number; className: string }) {
  const themes = [
    'from-rose-500 via-orange-400 to-amber-300',
    'from-slate-900 via-slate-700 to-orange-500',
    'from-violet-500 via-fuchsia-400 to-rose-300',
    'from-sky-600 via-cyan-400 to-teal-300',
    'from-amber-500 via-orange-400 to-red-400',
  ];

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${themes[index % themes.length]} ${className}`} aria-hidden="true">
      <div className="absolute -right-1 top-0 h-4 w-4 rounded-full bg-white/25" />
      <div className="absolute bottom-0 left-0 h-2 w-full bg-black/10" />
    </div>
  );
}

function EmptyApplications() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#fef2eb] text-[#d15d2d]">
        <DocumentIcon />
      </div>
      <h2 className="mt-3 text-sm font-black text-slate-900">No applications yet</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-slate-500">
        Once you apply for an event stand, its review status and invoice details will appear here.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link to="/vendor/events" className="rounded-md bg-[#f15a2a] px-3 py-1.5 text-[13px] font-bold text-white hover:bg-[#e24d1f]">Find events</Link>
        <Link to="/vendor/profile" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 hover:bg-slate-50">Business profile</Link>
      </div>
    </div>
  );
}

function isEventInPast(application: VendorApplication, now: number) {
  if (!application.event?.date) return false;
  const eventDate = new Date(application.event.date);
  if (!Number.isFinite(eventDate.getTime())) return false;
  const today = new Date(now);
  eventDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return eventDate.getTime() < today.getTime();
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(value: number | string, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}

function downloadInvoicePdf(application: VendorApplication) {
  const invoice = application.invoice;
  if (!invoice) return;

  const amount = Number(invoice.amount);
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
    `Total due: ${invoice.currency} ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`,
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

function getStatusLabel(application: VendorApplication, paid: boolean) {
  if (application.status === 'REJECTED') return 'Rejected';
  if (application.status === 'PENDING_REVIEW') return 'Applied';
  if (paid) return 'Paid';
  if (application.assignedStand) return 'Allocated';
  return 'Approved';
}

function getStatusClass(application: VendorApplication, paid: boolean) {
  if (application.status === 'REJECTED') return 'bg-rose-50 text-rose-700';
  if (application.status === 'PENDING_REVIEW') return 'bg-amber-50 text-amber-800';
  if (paid) return 'bg-emerald-50 text-emerald-700';
  return 'bg-sky-50 text-sky-700';
}

function DocumentIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
