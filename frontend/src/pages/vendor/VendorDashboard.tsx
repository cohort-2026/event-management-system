import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  Store,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { getNotifications, type AppNotification } from '@/services/notificationService';
import { getMyApplications, getVendorProfile } from '@/services/vendorService';
import type { VendorApplication, VendorApplicationStatus, VendorProfile } from '@/types/vendor';

const statusVariant: Record<VendorApplicationStatus, BadgeVariant> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
};

const statusLabel = (status: VendorApplicationStatus) => status.replaceAll('_', ' ').toLowerCase()
  .replace(/\b\w/g, character => character.toUpperCase());

function getErrorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data.message ?? fallback
    : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VendorDashboard() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const location = useLocation();

  useEffect(() => {
    const sectionId = location.pathname === '/vendor/my-events'
      ? 'upcoming-events'
      : location.pathname === '/vendor/notifications'
        ? 'recent-notifications'
        : null;
    if (!sectionId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      const [profileResult, applicationResult, notificationResult] = await Promise.allSettled([
        getVendorProfile(),
        getMyApplications(),
        getNotifications(),
      ]);
      if (!active) return;

      setCurrentTime(Date.now());
      const loadErrors: string[] = [];
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.data.data);
      } else {
        loadErrors.push(getErrorMessage(profileResult.reason, 'Business profile could not be loaded.'));
      }

      if (applicationResult.status === 'fulfilled') {
        setApplications(applicationResult.value.data.data);
      } else {
        loadErrors.push(getErrorMessage(applicationResult.reason, 'Applications could not be loaded.'));
      }

      if (notificationResult.status === 'fulfilled') {
        setNotifications(notificationResult.value.data.data);
      } else {
        loadErrors.push(getErrorMessage(notificationResult.reason, 'Notifications could not be loaded.'));
      }

      setErrors(loadErrors);
      setLoading(false);
    };

    void loadDashboard();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedApplication) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedApplication(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedApplication]);

  const query = search.trim().toLocaleLowerCase();
  const filteredApplications = useMemo(() => applications
    .filter(application => !query || [
      application.event?.title,
      application.requestedStandType,
      application.status,
    ].some(value => value?.toLocaleLowerCase().includes(query)))
    .slice(0, 5), [applications, query]);

  const upcomingApplications = useMemo(() => applications
    .filter(application => application.status === 'APPROVED')
    .filter(application => {
      const date = new Date(application.event?.date ?? '').getTime();
      return currentTime !== null && Number.isFinite(date) && date >= currentTime;
    })
    .sort((left, right) => new Date(left.event?.date ?? '').getTime() - new Date(right.event?.date ?? '').getTime()),
  [applications, currentTime]);

  const approvedCount = applications.filter(application => application.status === 'APPROVED').length;
  const pendingCount = applications.filter(application => application.status === 'PENDING_REVIEW').length;
  const recentNotifications = notifications.slice(0, 4);
  const businessName = profile?.businessName.trim() || '';
  const greetingName = businessName || 'Vendor';

  return (
    <VendorPortalLayout
      title={`Welcome back, ${greetingName}!`}
      subtitle="Manage your event applications, services and upcoming event participation."
      businessName={businessName}
      headerActions={(
        <label className="relative min-w-0 flex-1 md:w-64 md:flex-none">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search applications"
            aria-label="Search vendor applications"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:bg-white/10 dark:focus:ring-violet-500/10"
          />
        </label>
      )}
    >
      <div className="space-y-6">
        <section className="flex flex-wrap justify-end gap-3">
          <Link to="/vendor/events">
            <Button variant="secondary" className="h-10 rounded-xl">
              <CalendarDays size={16} /> Browse events
            </Button>
          </Link>
          <Link to="/vendor/applications">
            <Button variant="secondary" className="h-10 rounded-xl">View my applications</Button>
          </Link>
        </section>

        {errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <p className="font-semibold">Some dashboard information could not be loaded.</p>
            <ul className="mt-1 list-inside list-disc">{errors.map(error => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        <section aria-label="Vendor application statistics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <MetricCard label="Total applications" value={loading ? '—' : applications.length} description="All submitted stand requests" icon={FileText} tone="violet" />
          <MetricCard label="Approved applications" value={loading ? '—' : approvedCount} description="Approved by event organizers" icon={CheckCircle2} tone="green" />
          <MetricCard label="Pending applications" value={loading ? '—' : pendingCount} description="Waiting for organizer review" icon={Clock3} tone="amber" />
          <MetricCard label="Upcoming events" value={loading ? '—' : upcomingApplications.length} description="Future events with an approved stand" icon={CalendarDays} tone="blue" />
        </section>

        <div className="grid gap-6 xl:grid-cols-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-3">
            <PanelHeading
              title="Recent applications"
              description="Track organizer decisions and participation requests."
              action={<Link to="/vendor/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-800 dark:text-violet-300">View all <ArrowRight size={15} /></Link>}
            />
            {loading ? (
              <div className="flex justify-center py-14"><Spinner /></div>
            ) : applications.length === 0 ? (
              <EmptyState icon={FileText} title="No applications yet" description="Browse published events and submit your first stand application." action={<Link to="/vendor/events"><Button size="sm"><Plus size={15} /> Browse events</Button></Link>} />
            ) : filteredApplications.length === 0 ? (
              <EmptyState icon={Search} title="No matching applications" description="Try a different event, service, or status search." />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                      <tr>
                        <th scope="col" className="px-5 py-3">Event</th>
                        <th scope="col" className="px-4 py-3">Applied</th>
                        <th scope="col" className="px-4 py-3">Service</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                      {filteredApplications.map(application => (
                        <ApplicationRow key={application.id} application={application} onSelect={setSelectedApplication} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 md:hidden dark:divide-white/[0.07]">
                  {filteredApplications.map(application => (
                    <article key={application.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{application.event?.title ?? 'Event'}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(application.createdAt)}</p>
                        </div>
                        <Badge variant={statusVariant[application.status]}>{statusLabel(application.status)}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{application.requestedStandType}</p>
                        <button type="button" onClick={() => setSelectedApplication(application)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">View details</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              Organizer names are not included in the Vendor applications response.
            </div>
          </section>

          <section id="upcoming-events" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-2">
            <PanelHeading title="Upcoming events" description="Approved stands for future events." action={<BriefcaseBusiness size={18} className="text-violet-600 dark:text-violet-300" />} />
            {loading ? (
              <div className="flex justify-center py-14"><Spinner /></div>
            ) : upcomingApplications.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming events" description="Approved event participation will appear here." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                {upcomingApplications.slice(0, 4).map(application => (
                  <li key={application.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><CalendarDays size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{application.event?.title ?? 'Event'}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(application.event?.date ?? '')}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{application.event?.venue ?? 'Venue unavailable'} · {application.requestedStandType}</p>
                      <Badge variant="success" className="mt-2">Approved</Badge>
                    </div>
                    <button type="button" onClick={() => setSelectedApplication(application)} aria-label={`View ${application.event?.title ?? 'event'} details`} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-700 dark:hover:bg-white/10 dark:hover:text-violet-300"><ArrowRight size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-5">
          <section id="recent-notifications" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-3">
            <PanelHeading title="Recent notifications" description="Application and account updates." action={<Link to="/vendor/applications" className="text-sm font-semibold text-violet-700 hover:text-violet-800 dark:text-violet-300">View applications</Link>} />
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : recentNotifications.length === 0 ? (
              <EmptyState icon={BellRing} title="You’re all caught up" description="Application decisions and other account updates will appear here." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                {recentNotifications.map(notification => (
                  <li key={notification.id}>
                    <Link to={notification.link} className={`flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03] ${notification.readAt ? '' : 'bg-violet-50/50 dark:bg-violet-500/[0.06]'}`}>
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-violet-600'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900 dark:text-slate-100">{notification.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{notification.message}</span>
                        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{formatDate(notification.createdAt)}</span>
                      </span>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick actions</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Common tasks for your vendor business.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <QuickAction to="/vendor/events" icon={CalendarDays} label="Browse available events" />
              <QuickAction to="/vendor/events" icon={Plus} label="Submit an application" />
              <QuickAction to="/vendor/applications" icon={FileText} label="View applications" />
              <QuickAction to="/vendor/profile" icon={Store} label="Update business profile" />
              <QuickAction to="/vendor/profile" icon={BriefcaseBusiness} label="Manage services" />
              <QuickAction to="/vendor/staff" icon={Users} label="Manage staff" />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Invoice amounts and statuses are available with application details. Online payment and invoice downloads aren’t currently supported.
            </p>
          </section>
        </div>
      </div>
      {selectedApplication && (
        <div
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelectedApplication(null);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        >
          <section role="dialog" aria-modal="true" aria-labelledby="application-details-title" className="max-h-[min(90vh,48rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171823]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Vendor application</p>
                <h2 id="application-details-title" className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">{selectedApplication.event?.title ?? 'Event details unavailable'}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submitted {formatDate(selectedApplication.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={statusVariant[selectedApplication.status]}>{statusLabel(selectedApplication.status)}</Badge>
                <button type="button" autoFocus onClick={() => setSelectedApplication(null)} aria-label="Close application details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><X size={18} /></button>
              </div>
            </header>
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Detail label="Event date" value={selectedApplication.event?.date ? formatDate(selectedApplication.event.date) : 'Not available'} />
              <Detail label="Venue" value={selectedApplication.event?.venue || 'Not available'} />
              <Detail label="Service category" value={selectedApplication.requestedStandType} />
              <Detail label="Requested stand size" value={selectedApplication.requestedStandSize} />
              <Detail label="Quoted amount" value={`${selectedApplication.invoice?.currency ?? ''} ${Number(selectedApplication.quotedAmount).toFixed(2)}`} />
              {selectedApplication.assignedStand && <Detail label="Assigned stand" value={selectedApplication.assignedStand} />}
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Service description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{selectedApplication.standDescription || selectedApplication.description || 'No description provided.'}</p>
              </div>
              {selectedApplication.rejectionReason && (
                <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Organizer feedback</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-rose-800 dark:text-rose-200">{selectedApplication.rejectionReason}</p>
                </div>
              )}
              {selectedApplication.invoice && (
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Invoice {selectedApplication.invoice.invoiceNumber}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedApplication.invoice.currency} {Number(selectedApplication.invoice.amount).toFixed(2)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Status: {selectedApplication.invoice.status} · Due {formatDate(selectedApplication.invoice.dueAt)}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Online payment and invoice downloads aren’t currently supported.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </VendorPortalLayout>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: 'violet' | 'green' | 'amber' | 'blue';
}) {
  const tones = {
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300',
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#171823]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={20} /></span>
      </div>
      <p className="mt-4 min-h-5 text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p>
    </article>
  );
}

function PanelHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <Icon size={26} className="mx-auto text-slate-300 dark:text-slate-600" />
      <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ApplicationRow({ application, onSelect }: { application: VendorApplication; onSelect: (application: VendorApplication) => void }) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.025]">
      <td className="px-5 py-4">
        <p className="max-w-52 truncate font-semibold text-slate-900 dark:text-slate-100">{application.event?.title ?? 'Event'}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Organizer details unavailable</p>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(application.createdAt)}</td>
      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{application.requestedStandType}</td>
      <td className="px-4 py-4"><Badge variant={statusVariant[application.status]}>{statusLabel(application.status)}</Badge></td>
      <td className="px-4 py-4 text-right">
        <button type="button" onClick={() => onSelect(application)} className="whitespace-nowrap text-sm font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200">View details</button>
      </td>
    </tr>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-100 hover:bg-violet-50/70 hover:text-violet-700 dark:border-white/[0.07] dark:text-slate-300 dark:hover:border-violet-400/20 dark:hover:bg-violet-500/10 dark:hover:text-violet-200">
      <Icon size={17} className="shrink-0 text-violet-600 dark:text-violet-300" />
      <span className="flex-1">{label}</span>
      <ArrowRight size={15} className="text-slate-400" />
    </Link>
  );
}
