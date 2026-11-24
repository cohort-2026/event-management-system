import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from '@/layouts/NotificationBell';
import Spinner from '@/components/legacy/Spinner';
import { useAuth } from '@/context/useAuth';
import { getAdminAuditHistory, type AdminAuditEvent } from '@/features/admin/services/adminService';
import { getAdminEventReportSummary, getEvents } from '@/features/events/services/eventService';
import { getOrganizers } from '@/features/organizer/services/organizerService';
import { getPendingVendorProfiles } from '@/features/vendor/services/vendorService';
import { getUsers } from '@/services/userService';
import type { Event } from '@/types/event';
import type { User, UserRole } from '@/types/user';
import { StatCard } from '@/components/shared';

interface SearchResult {
  id: string;
  title: string;
  detail: string;
  kind: 'Event' | 'Person';
  to: string;
}

interface DashboardStats {
  totalUsers: number;
  attendees: number;
  vendors: number;
  organizers: number;
  admins: number;
  pendingOrganizers: number;
  pendingVendors: number;
  totalEvents: number;
  publishedEvents: number;
  cancelledEvents: number;
  completedEvents: number;
  totalBookings: number;
  attendancePercentage: number;
}

const roleLabel: Record<UserRole, string> = {
  ATTENDEE: 'Attendee', VENDOR: 'Vendor', ORGANIZER: 'Organizer', ADMIN: 'Admin',
};

const getErrorMessage = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data.message ?? 'Admin dashboard data could not be loaded.'
  : 'Admin dashboard data could not be loaded.';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const roles: UserRole[] = ['ATTENDEE', 'VENDOR', 'ORGANIZER', 'ADMIN'];
      const [allUsers, roleCounts, organizers, vendors, report, audit] = await Promise.all([
        getUsers({ page: 1, limit: 1 }),
        Promise.all(roles.map(role => getUsers({ page: 1, limit: 1, role }))),
        getOrganizers(),
        getPendingVendorProfiles(),
        getAdminEventReportSummary(),
        getAdminAuditHistory(),
      ]);
      const usersByRole = new Map(roles.map((role, index) => [role, roleCounts[index].data.pagination.total]));
      const eventSummary = report.data.data.summary;
      setStats({
        totalUsers: allUsers.data.pagination.total,
        attendees: usersByRole.get('ATTENDEE') ?? 0,
        vendors: usersByRole.get('VENDOR') ?? 0,
        organizers: usersByRole.get('ORGANIZER') ?? 0,
        admins: usersByRole.get('ADMIN') ?? 0,
        pendingOrganizers: organizers.data.data.filter(item => item.profileApprovalStatus === 'PENDING_APPROVAL' && item.isActive).length,
        pendingVendors: vendors.data.data.filter(item => item.user.isActive).length,
        totalEvents: eventSummary.totalEvents,
        publishedEvents: eventSummary.publishedEvents,
        cancelledEvents: eventSummary.cancelledEvents,
        completedEvents: eventSummary.completedEvents,
        totalBookings: eventSummary.totalBookings,
        attendancePercentage: eventSummary.attendancePercentage,
      });
      setRecentActivity(audit.data.data.slice(0, 6));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) { setSearchResults([]); setSearchError(''); return; }
    setSearching(true);
    setSearchError('');
    try {
      const [eventsResponse, usersResponse] = await Promise.all([
        getEvents(), getUsers({ search: query, page: 1, limit: 5 }),
      ]);
      const eventResults: SearchResult[] = eventsResponse.data.data
        .filter((event: Event) => event.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map((event: Event) => ({ id: event.id, title: event.title, detail: 'Published event', kind: 'Event', to: `/events/${event.id}` }));
      const userResults: SearchResult[] = usersResponse.data.data.map((person: User) => ({
        id: person.id,
        title: `${person.firstname} ${person.lastname}`,
        detail: `${person.email} · ${roleLabel[person.role]}`,
        kind: 'Person',
        to: `/admin/user-accounts?search=${encodeURIComponent(person.email)}`,
      }));
      setSearchResults([...eventResults, ...userResults]);
      if (!eventResults.length && !userResults.length) setSearchError('No matching published events or people were found.');
    } catch (searchLoadError) {
      setSearchError(getErrorMessage(searchLoadError));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const firstName = user?.firstname || 'Administrator';
  const userCards = [
    { label: 'Registered users', value: stats?.totalUsers, hint: 'All account roles' },
    { label: 'Attendees', value: stats?.attendees, hint: 'Event participants' },
    { label: 'Organizers', value: stats?.organizers, hint: `${stats?.pendingOrganizers ?? '—'} awaiting review` },
    { label: 'Vendors', value: stats?.vendors, hint: `${stats?.pendingVendors ?? '—'} awaiting review` },
  ];
  const eventCards = [
    { label: 'Total events', value: stats?.totalEvents },
    { label: 'Published', value: stats?.publishedEvents },
    { label: 'Completed', value: stats?.completedEvents },
    { label: 'Cancelled', value: stats?.cancelledEvents },
    { label: 'Bookings', value: stats?.totalBookings },
    { label: 'Attendance', value: stats ? `${stats.attendancePercentage}%` : undefined },
  ];

  return (
    <div className="min-h-full space-y-5 text-[#1f2937] antialiased sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 shadow-sm sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a63f61]">EventMS administration</p>
          <p className="mt-1 text-sm font-medium text-[#5a6470]">Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <label className="sr-only" htmlFor="admin-global-search">Search events and people</label>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]"><SearchIcon /></span>
            <input id="admin-global-search" value={search} onChange={event => { setSearch(event.target.value); setSearchResults([]); setSearchError(''); }} placeholder="Search events, people..." className="h-10 w-[min(230px,52vw)] rounded-lg border border-[#dfe3ea] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#d14d74] focus:ring-2 focus:ring-[#f7dfe4]" />
            {(searchResults.length > 0 || searchError || searching) && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-xl">
                {searching ? <p className="px-4 py-3 text-sm text-[#6b7280]">Searching...</p> : searchError ? <p className="px-4 py-3 text-sm text-[#6b7280]">{searchError}</p> : (
                  <ul className="max-h-80 divide-y divide-[#eef0f3] overflow-y-auto">
                    {searchResults.map(result => <li key={`${result.kind}-${result.id}`}><button type="button" onClick={() => navigate(result.to)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f7f8fa]"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{result.title}</span><span className="block truncate text-xs text-[#6b7280]">{result.detail}</span></span><span className="text-[10px] font-bold uppercase text-[#8c93a0]">{result.kind}</span></button></li>)}
                  </ul>
                )}
              </div>
            )}
          </form>
          <NotificationBell />
        </div>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#a63f61]">Platform overview</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">Welcome back, {firstName}</h1>
          <p className="mt-2 text-sm text-[#667085]">A current view of accounts, event activity, and profile reviews.</p>
        </div>
        <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="rounded-lg border border-[#dfe3ea] bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] shadow-sm hover:bg-[#f8f8f7] disabled:opacity-50">Refresh data</button>
      </section>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => void loadDashboard()} className="font-semibold underline">Try again</button></div>}

      <section aria-labelledby="user-metrics-title">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="user-metrics-title" className="text-sm font-bold text-[#364152]">Accounts</h2><Link to="/admin/user-accounts" className="text-xs font-semibold text-[#a63f61] hover:text-[#81344f]">Manage users →</Link></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {userCards.map(card => <MetricCard key={card.label} {...card} loading={loading} />)}
        </div>
      </section>

      <section aria-labelledby="review-queue-title">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 id="review-queue-title" className="text-sm font-bold text-[#364152]">Profile review queue</h2><p className="mt-0.5 text-xs text-[#7b8491]">Review organizer and vendor profiles. Events are managed by organizers.</p></div></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ReviewCard title="Organizer profiles" description="Verify organizer identity and organization details." count={stats?.pendingOrganizers} loading={loading} to="/admin/users/organizers/pending" />
          <ReviewCard title="Vendor profiles" description="Review business information and submitted documents." count={stats?.pendingVendors} loading={loading} to="/admin/users/vendors/pending" />
        </div>
      </section>

      <section aria-labelledby="event-metrics-title">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 id="event-metrics-title" className="text-sm font-bold text-[#364152]">Events and activity</h2><p className="mt-0.5 text-xs text-[#7b8491]">Live counts from event and booking reports.</p></div><Link to="/admin/reports" className="text-xs font-semibold text-[#a63f61] hover:text-[#81344f]">Open reports →</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {eventCards.map(card => <div key={card.label} className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm"><p className="text-xs font-medium text-[#697482]">{card.label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight">{loading ? <span className="text-[#c2c7ce]">···</span> : formatValue(card.value)}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="admin-recent-activity-title" className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 id="admin-recent-activity-title" className="text-sm font-bold">Recent administrative activity</h2><p className="mt-0.5 text-xs text-[#7b8491]">Recorded decisions and account changes.</p></div><Link to="/admin/audit" className="text-xs font-semibold text-[#a63f61] hover:text-[#81344f]">Audit history →</Link></div>
        {loading && !recentActivity.length ? <div className="flex justify-center py-8"><Spinner /></div> : recentActivity.length ? (
          <ul className="divide-y divide-[#eef0f3]">
            {recentActivity.map(activity => <li key={activity.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5e8ed] text-xs font-bold text-[#923b58]">{`${activity.actor.firstname[0] ?? ''}${activity.actor.lastname[0] ?? ''}`.toUpperCase() || 'A'}</span><div className="min-w-0 flex-1"><p className="text-sm text-[#273142]"><span className="font-semibold">{activity.actor.firstname} {activity.actor.lastname}</span> {formatAuditAction(activity.action)}</p><p className="mt-0.5 text-xs capitalize text-[#7b8491]">{activity.outcome.replaceAll('_', ' ')}</p></div><time dateTime={activity.createdAt} className="shrink-0 text-xs text-[#7b8491]">{new Date(activity.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</time></li>)}
          </ul>
        ) : <p className="py-6 text-center text-sm text-[#6b7280]">No recent administrative activity.</p>}
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint, loading }: { label: string; value?: number; hint: string; loading: boolean }) {
  return <StatCard title={label} value={loading ? '—' : formatValue(value)} description={hint} />;
}

function ReviewCard({ title, description, count, loading, to }: { title: string; description: string; count?: number; loading: boolean; to: string }) {
  return <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent-500/40 hover:bg-muted/40"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600"><ClipboardIcon /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-foreground">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span><span className="flex shrink-0 flex-col items-end"><span className="font-heading text-2xl font-bold">{loading ? '—' : formatValue(count)}</span><span className="text-[10px] font-semibold text-muted-foreground">pending</span></span><span className="text-accent-600 transition group-hover:translate-x-0.5">→</span></Link>;
}

function formatValue(value: number | string | undefined) { return value === undefined ? '—' : typeof value === 'number' ? value.toLocaleString('en-ZA') : value; }

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    ORGANIZER_PROFILE_APPROVED: 'approved an organizer profile', ORGANIZER_PROFILE_REJECTED: 'rejected an organizer profile',
    ORGANIZER_ACCOUNT_CREATED: 'created an organizer account', ORGANIZER_ACCOUNT_DELETED: 'deleted an organizer account',
    VENDOR_PROFILE_APPROVED: 'approved a vendor profile', VENDOR_PROFILE_REJECTED: 'rejected a vendor profile',
    VENDOR_ACCOUNT_DELETED: 'deleted a vendor account', USER_ACCOUNT_DEACTIVATED: 'deactivated a user account',
    USER_ACCOUNT_ACTIVATED: 'activated a user account', USER_ROLE_UPDATED: 'updated a user role',
  };
  return labels[action] ?? action.toLowerCase().replaceAll('_', ' ');
}

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>; }
function ClipboardIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5.5h6V3H9v2.5ZM9 11h6M9 15h6" strokeLinecap="round" /></svg>; }
