import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import NotificationBell from '@/layouts/NotificationBell';
import Spinner from '@/components/legacy/Spinner';
import { getAdminAuditHistory, type AdminAuditEvent } from '@/features/admin/services/adminService';
import { getAdminEventAnalytics, getEvents } from '@/features/events/services/eventService';
import type { AdminEventAnalytics } from '@/features/events/services/eventService';
import { getUsers } from '@/services/userService';
import type { Event, EventStatus } from '@/types/event';
import type { User } from '@/types/user';

type ReportTab = 'Overview' | 'Events' | 'Bookings' | 'Organisers' | 'Vendors' | 'Payments' | 'Audit';
const reportTabs: ReportTab[] = ['Overview', 'Events', 'Bookings', 'Organisers', 'Vendors', 'Payments', 'Audit'];
const eventStatuses: Array<'ALL' | EventStatus> = ['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED', 'COMPLETED'];

const responseMessage = (error: unknown) => (
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data.message ?? 'Reports could not be loaded.'
    : error instanceof Error ? error.message : 'Reports could not be loaded.'
);

const bookedPlaces = (event: Event) => Math.max(0, Number(event.capacity) - Number(event.availableCapacity));
const fillRate = (event: Event) => event.capacity > 0 ? Math.round((bookedPlaces(event) / event.capacity) * 100) : 0;
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

function downloadCsv(filename: string, columns: string[], rows: unknown[][]) {
  const csv = [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminReports() {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [analytics, setAnalytics] = useState<AdminEventAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('Overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getEvents(), getUsers(), getAdminEventAnalytics(), getAdminAuditHistory()])
      .then(([eventsResponse, usersResponse, analyticsResponse, auditResponse]) => {
        if (!active) return;
        setEvents(eventsResponse.data.data);
        setUsers(usersResponse.data.data);
        setAnalytics(analyticsResponse.data.data);
        setAuditEvents(auditResponse.data.data);
      })
      .catch(loadError => {
        if (active) setError(responseMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredEvents = useMemo(() => events.filter(event => {
    const eventDate = new Date(event.startTime || event.date);
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || `${event.title} ${event.category} ${event.venue} ${event.organizer?.firstname ?? ''} ${event.organizer?.lastname ?? ''}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;
    const matchesFrom = !dateFrom || eventDate >= new Date(`${dateFrom}T00:00:00`);
    const matchesTo = !dateTo || eventDate < new Date(`${dateTo}T23:59:59.999`);
    return matchesQuery && matchesStatus && matchesFrom && matchesTo;
  }), [events, search, statusFilter, dateFrom, dateTo]);

  const filteredUsers = useMemo(() => users.filter(user => {
    const role = activeTab === 'Organisers' ? 'ORGANIZER' : activeTab === 'Vendors' ? 'VENDOR' : null;
    const matchesRole = !role || user.role === role;
    const matchesSearch = !search || `${user.firstname} ${user.lastname} ${user.email} ${user.organizationName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesRole && matchesSearch;
  }), [users, activeTab, search]);

  const filteredAudit = useMemo(() => auditEvents.filter(event => {
    const eventDate = new Date(event.createdAt);
    const matchesQuery = !search || `${event.action} ${event.outcome} ${event.actor.firstname} ${event.actor.lastname} ${event.actor.email}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFrom = !dateFrom || eventDate >= new Date(`${dateFrom}T00:00:00`);
    const matchesTo = !dateTo || eventDate < new Date(`${dateTo}T23:59:59.999`);
    return matchesQuery && matchesFrom && matchesTo;
  }), [auditEvents, search, dateFrom, dateTo]);

  const upcomingPublishedCount = filteredEvents.filter(event => event.status === 'PUBLISHED' && new Date(event.startTime) >= new Date()).length;
  const totalBookedPlaces = filteredEvents.reduce((sum, event) => sum + bookedPlaces(event), 0);
  const totalCapacity = filteredEvents.reduce((sum, event) => sum + Number(event.capacity), 0);
  const averageFillRate = totalCapacity ? Math.round((totalBookedPlaces / totalCapacity) * 100) : 0;
  const exportReport = () => {
    if (activeTab === 'Payments') return;
    if (activeTab === 'Organisers' || activeTab === 'Vendors') {
      downloadCsv(`${activeTab.toLowerCase()}-report.csv`, ['Name', 'Email', 'Organization', 'Role', 'Active', 'Created'], filteredUsers.map(user => [
        `${user.firstname} ${user.lastname}`, user.email, user.organizationName ?? '', user.role, user.isActive === false ? 'No' : 'Yes', user.createdAt,
      ]));
      return;
    }
    if (activeTab === 'Audit') {
      downloadCsv('audit-report.csv', ['Date', 'Action', 'Actor', 'Affected user', 'Outcome'], filteredAudit.map(event => [
        event.createdAt, event.action, `${event.actor.firstname} ${event.actor.lastname}`, event.affectedUserId ?? '', event.outcome,
      ]));
      return;
    }
    downloadCsv(`${activeTab.toLowerCase()}-report.csv`, ['Event', 'Date', 'Category', 'Status', 'Capacity', 'Booked places', 'Fill rate', 'Organizer'], filteredEvents.map(event => [
      event.title, event.startTime, event.category, event.status, event.capacity, bookedPlaces(event), `${fillRate(event)}%`, event.organizer ? `${event.organizer.firstname} ${event.organizer.lastname}` : '',
    ]));
  };

  const printReport = () => window.print();

  return (
    <div className="min-w-0 rounded-[18px] border border-[#dfe3ea] bg-[#f7f7f6] p-3 text-[#1f2937] antialiased sm:p-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-[#5a6470]">Reports</div>
        <div className="ml-auto flex w-full items-center justify-end gap-3 sm:w-auto">
          <NotificationBell />
        </div>
      </header>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold tracking-[-0.06em] text-[#1f2937] sm:text-[34px]">Reports</h1>
        <div className="flex items-center gap-2 print:hidden">
          {activeTab !== 'Payments' && <button type="button" onClick={exportReport} className="rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f8f8f7]">CSV / Excel</button>}
          <button type="button" onClick={printReport} className="rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f8f8f7]">Print / PDF</button>
        </div>
      </div>

      <div role="tablist" aria-label="Report type" className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-[#f2f3f2] p-1 print:hidden">
        {reportTabs.map(tab => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${activeTab === tab ? 'bg-[#e6e7e8] text-[#1f2937] shadow-sm' : 'text-[#65707d] hover:bg-white/70'}`}>
            {tab === 'Organisers' ? 'Organisers' : tab === 'Audit' ? 'User activity & audit' : tab}
          </button>
        ))}
      </div>

      {activeTab !== 'Payments' && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_180px_180px_180px] print:hidden">
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={activeTab === 'Organisers' || activeTab === 'Vendors' ? 'Search people...' : activeTab === 'Audit' ? 'Search activity...' : 'Search events...'} aria-label="Search report data" className="h-10 min-w-0 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#d8dce2]" />
          {activeTab !== 'Organisers' && activeTab !== 'Vendors' && activeTab !== 'Audit' && (
            <select aria-label="Filter events by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'ALL' | EventStatus)} className="h-10 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#374151]">
              {eventStatuses.map(status => <option key={status} value={status}>{status === 'ALL' ? 'All statuses' : status.charAt(0) + status.slice(1).toLowerCase()}</option>)}
            </select>
          )}
          {activeTab !== 'Organisers' && activeTab !== 'Vendors' && <>
            <input type="date" aria-label="From date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="h-10 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#374151]" />
            <input type="date" aria-label="To date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="h-10 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#374151]" />
          </>}
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div role="status" className="flex min-h-52 items-center justify-center"><Spinner /></div> : activeTab === 'Payments' ? (
        <section className="rounded-xl border border-[#e5e7eb] bg-white p-6">
          <h2 className="font-bold text-[#1f2937]">Financial and payment reports</h2>
          <p className="mt-2 text-sm leading-6 text-[#5f6b7a]">Payment records are not currently available to the Admin reporting screens, so financial totals cannot be reported here.</p>
        </section>
      ) : activeTab === 'Organisers' || activeTab === 'Vendors' ? (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_120px_100px] gap-3 bg-[#f8f8f7] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6b7280] max-sm:grid-cols-[minmax(0,1fr)_100px]">
            <span>Name</span><span className="hidden sm:block">Email</span><span>Status</span><span className="hidden sm:block">Created</span>
          </div>
          {filteredUsers.filter(user => user.role === (activeTab === 'Organisers' ? 'ORGANIZER' : 'VENDOR')).map(user => (
            <div key={user.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_120px_100px] gap-3 border-t border-[#eef0f3] px-4 py-3 text-sm max-sm:grid-cols-[minmax(0,1fr)_100px]">
              <span className="min-w-0 truncate font-medium">{user.firstname} {user.lastname}{user.organizationName ? ` · ${user.organizationName}` : ''}</span>
              <span className="hidden truncate text-[#5f6b7a] sm:block">{user.email}</span>
              <span className="text-[#5f6b7a]">{user.isActive === false ? 'Inactive' : user.role === 'VENDOR' ? user.vendorProfileStatus ?? 'Pending' : user.profileApprovalStatus ?? 'Pending'}</span>
              <time className="hidden text-xs text-[#6b7280] sm:block">{formatDate(user.createdAt)}</time>
            </div>
          ))}
          {filteredUsers.filter(user => user.role === (activeTab === 'Organisers' ? 'ORGANIZER' : 'VENDOR')).length === 0 && <p className="p-6 text-center text-sm text-[#6b7280]">No matching accounts.</p>}
        </section>
      ) : activeTab === 'Audit' ? (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          {filteredAudit.map(event => (
            <div key={event.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 border-b border-[#eef0f3] px-4 py-3 text-sm last:border-0">
              <time className="w-28 shrink-0 text-xs text-[#6b7280]">{formatDate(event.createdAt)}</time>
              <span className="min-w-0 flex-1"><strong>{event.actor.firstname} {event.actor.lastname}</strong> {event.action.toLowerCase().replaceAll('_', ' ')} <span className="text-[#6b7280]">({event.outcome.replaceAll('_', ' ')})</span></span>
            </div>
          ))}
          {filteredAudit.length === 0 && <p className="p-6 text-center text-sm text-[#6b7280]">No matching activity.</p>}
        </section>
      ) : (
        <>
          {activeTab === 'Overview' && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ReportStat label="Upcoming published events" value={upcomingPublishedCount} />
              <ReportStat label="Booked places" value={totalBookedPlaces.toLocaleString('en-ZA')} />
              <ReportStat label="Capacity fill" value={`${averageFillRate}%`} />
            </div>
          )}
          {activeTab === 'Overview' && analytics && <CategoryReport categories={analytics.publishedByCategory} />}
          <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="hidden grid-cols-[minmax(180px,1.5fr)_minmax(100px,1fr)_minmax(100px,1fr)_100px_100px_90px] gap-3 bg-[#f8f8f7] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6b7280] md:grid">
              <span>Event</span><span>Category</span><span>Organizer</span><span>Status</span><span>Booked / capacity</span><span>Fill rate</span>
            </div>
            {filteredEvents.map(event => (
              <div key={event.id} className="grid grid-cols-1 gap-2 border-t border-[#eef0f3] px-4 py-3 text-sm md:grid-cols-[minmax(180px,1.5fr)_minmax(100px,1fr)_minmax(100px,1fr)_100px_100px_90px] md:items-center md:gap-3">
                <div className="min-w-0"><span className="block truncate font-semibold">{event.title}</span><span className="text-xs text-[#6b7280]">{formatDate(event.startTime)}</span></div>
                <span className="truncate text-[#5f6b7a]">{event.category}</span>
                <span className="truncate text-[#5f6b7a]">{event.organizer ? `${event.organizer.firstname} ${event.organizer.lastname}` : '—'}</span>
                <span className="text-[#5f6b7a]">{event.status}</span>
                <span className="text-[#5f6b7a]">{bookedPlaces(event)} / {event.capacity}</span>
                <span className="font-semibold text-[#374151]">{fillRate(event)}%</span>
              </div>
            ))}
            {filteredEvents.length === 0 && <p className="p-6 text-center text-sm text-[#6b7280]">No events match these filters.</p>}
          </section>
        </>
      )}
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[#e5e7eb] bg-white p-4"><div className="text-xs text-[#697482]">{label}</div><div className="mt-2 text-2xl font-extrabold text-[#111827]">{value}</div></div>;
}

function CategoryReport({ categories }: { categories: Array<{ category: string; count: number }> }) {
  if (categories.length === 0) return null;
  const max = Math.max(...categories.map(item => item.count), 1);
  return (
    <section className="mb-5 rounded-xl border border-[#e5e7eb] bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-[#1f2937]">Published events by category</h2>
      <div className="space-y-3">
        {categories.map(item => (
          <div key={item.category} className="grid grid-cols-[minmax(90px,140px)_minmax(0,1fr)_32px] items-center gap-3 text-xs">
            <span className="truncate text-[#5f6b7a]">{item.category}</span>
            <div className="h-2 overflow-hidden rounded-full bg-[#eef0f3]"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.round((item.count / max) * 100)}%` }} /></div>
            <span className="text-right font-semibold text-[#374151]">{item.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
