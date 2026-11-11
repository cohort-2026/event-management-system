import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Ellipsis,
  ExternalLink,
  Plus,
  Search,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import OrganizerPageLayout from '@/components/organizer/OrganizerPageLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { cancelEvent, getMyEvents, publishEvent } from '@/services/eventService';
import type { Event, EventStatus } from '@/types/event';
import type { BadgeVariant } from '@/components/ui/Badge';

const OrganizerDashboardCharts = lazy(() => import('@/components/organizer/OrganizerDashboardCharts'));

const statusVariant: Record<EventStatus, BadgeVariant> = {
  PUBLISHED: 'success',
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  COMPLETED: 'info',
};

const statusLabel = (status: EventStatus): string => status.replaceAll('_', ' ');
const formatDate = (date: string): string => new Date(date).toLocaleString('en-ZA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dashboardOpenedAt = Date.now();

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/+$/, '') || '/';
  const isMyEventsPage = currentPath === '/organizer/events';
  const isAnalyticsPage = currentPath === '/organizer/analytics';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then(response => {
        if (active) setEvents(response.data.data);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Your events could not be loaded.')
            : 'Your events could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return events;
    return events.filter(event =>
      [event.title, event.venue, event.category, event.status].some(value =>
        value.toLocaleLowerCase().includes(query),
      ),
    );
  }, [events, search]);

  const upcomingEvents = useMemo(() => filteredEvents
    .filter(event => new Date(event.startTime).getTime() >= dashboardOpenedAt)
    .filter(event => event.status !== 'CANCELLED' && event.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()), [filteredEvents]);

  const registeredPlaces = events.reduce(
    (total, event) => total + Math.max(0, event.capacity - event.availableCapacity),
    0,
  );
  const publishedEvents = events.filter(event => event.status === 'PUBLISHED').length;
  const publish = async (eventId: string) => {
    setError('');
    setNotice('');
    setSubmittingId(eventId);
    try {
      const response = await publishEvent(eventId);
      setNotice(response.data.message ?? 'Event Published');
      const refreshed = await getMyEvents();
      setEvents(refreshed.data.data);
    } catch (publishError) {
      setError(axios.isAxiosError(publishError)
        ? (publishError.response?.data?.message ?? 'Event could not be published.')
        : 'Event could not be published.');
    } finally {
      setSubmittingId(null);
    }
  };

  const cancel = async (event: Event) => {
    if (!window.confirm(`Cancel "${event.title}"? Registered attendees and approved vendors will be notified.`)) return;
    setError('');
    setNotice('');
    setCancellingId(event.id);
    try {
      const response = await cancelEvent(event.id);
      setNotice(response.data.message ?? 'Event cancelled.');
      const refreshed = await getMyEvents();
      setEvents(refreshed.data.data);
    } catch (cancelError) {
      setError(axios.isAxiosError(cancelError)
        ? (cancelError.response?.data?.message ?? 'Event could not be cancelled.')
        : 'Event could not be cancelled.');
    } finally {
      setCancellingId(null);
    }
  };

  const statCards: StatCardData[] = [
    { label: 'Total events', value: events.length, note: 'No previous-period data', icon: CalendarDays, color: 'violet', direction: null },
    { label: 'Published events', value: publishedEvents, note: 'No previous-period data', icon: Ticket, color: 'blue', direction: null },
    { label: 'Registered places', value: registeredPlaces.toLocaleString(), note: 'Across all your events', icon: Users, color: 'green', direction: null },
    { label: 'Total revenue', value: '—', note: 'Not available from the current API', icon: CircleDollarSign, color: 'amber', direction: null },
  ];

  const pageTitle = isMyEventsPage
    ? 'My Events'
    : isAnalyticsPage
      ? 'Event Analytics'
      : `Welcome back, ${user?.firstname ?? 'Organizer'}!`;
  const pageSubtitle = isMyEventsPage
    ? 'Manage your events and track their status.'
    : isAnalyticsPage
      ? 'Review event registrations and status performance.'
      : "Here's what's happening with your events today.";

  return (
    <OrganizerPageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      breadcrumbs={[{ label: isMyEventsPage ? 'My Events' : isAnalyticsPage ? 'Event Analytics' : 'Overview' }]}
      headerActions={(
        <label className="relative min-w-0 flex-1 md:w-64 md:flex-none">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search events..."
            aria-label="Search events"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-violet-400 dark:focus:bg-white/10 dark:focus:ring-violet-500/10"
          />
        </label>
      )}
    >
      <div className="space-y-6">
        <section className="flex flex-wrap justify-end gap-3">
          {!isMyEventsPage && !isAnalyticsPage && (
            <Link to="/organizer/events" className="inline-flex">
              <Button variant="secondary" className="h-10 rounded-xl">
                View all events
              </Button>
            </Link>
          )}
          <Link to="/organizer/events/create" className="inline-flex">
            <Button className="h-10 rounded-xl bg-violet-600 shadow-sm shadow-violet-600/20 hover:bg-violet-700">
              <Plus size={17} /> Create new event
            </Button>
          </Link>
        </section>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}

        <section aria-label="Organizer statistics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {statCards.map(card => <StatCard key={card.label} {...card} />)}
        </section>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171823]">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {!isMyEventsPage && (
              <Suspense fallback={<div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171823]"><Spinner /></div>}>
                <OrganizerDashboardCharts events={events} />
              </Suspense>
            )}

            <EventsTable
              events={isMyEventsPage ? filteredEvents : upcomingEvents}
              isMyEventsPage={isMyEventsPage}
              search={search}
              submittingId={submittingId}
              cancellingId={cancellingId}
              onPublish={publish}
              onCancel={cancel}
            />

            {!isMyEventsPage && (
              <div className="grid gap-5 xl:grid-cols-5">
                <RecentBookingsPanel />
                <QuickActionsPanel />
              </div>
            )}
          </>
        )}
      </div>
    </OrganizerPageLayout>
  );
}

interface StatCardData {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  color: 'violet' | 'blue' | 'green' | 'amber';
  direction: 'up' | 'down' | null;
}

function StatCard({ label, value, note, icon: Icon, color, direction }: StatCardData) {
  const colors = {
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#171823] dark:hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </span>
      </div>
      <div className="mt-4 flex min-h-5 items-center gap-1.5 text-xs">
        {direction === 'up' && <ArrowUpRight size={14} className="text-emerald-600" />}
        {direction === 'down' && <ArrowDownRight size={14} className="text-rose-600" />}
        <span className="font-medium text-slate-500 dark:text-slate-400">{note}</span>
      </div>
    </article>
  );
}

interface EventsTableProps {
  events: Event[];
  isMyEventsPage: boolean;
  search: string;
  submittingId: string | null;
  cancellingId: string | null;
  onPublish: (eventId: string) => void;
  onCancel: (event: Event) => void;
}

function EventsTable({
  events,
  isMyEventsPage,
  search,
  submittingId,
  cancellingId,
  onPublish,
  onCancel,
}: EventsTableProps) {
  const hasSearch = Boolean(search.trim());
  const title = isMyEventsPage ? 'All events' : 'Upcoming events';
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'PAST'>('ALL');
  const categories = [...new Set(events.map(event => event.category))].sort((a, b) => a.localeCompare(b));
  const visibleEvents = events.filter(event => {
    if (statusFilter !== 'ALL' && event.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && event.category !== categoryFilter) return false;
    if (timeFilter !== 'ALL') {
      const start = new Date(event.startTime).getTime();
      const end = new Date(event.endTime).getTime();
      const now = dashboardOpenedAt;
      if (timeFilter === 'UPCOMING' && start <= now) return false;
      if (timeFilter === 'ONGOING' && !(start <= now && end >= now)) return false;
      if (timeFilter === 'PAST' && end >= now) return false;
    }
    return true;
  });
  const emptyTitle = hasSearch || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || timeFilter !== 'ALL'
    ? 'No matching events'
    : isMyEventsPage ? 'No events yet' : 'No upcoming events';

  return (
    <section id="upcoming-events" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isMyEventsPage ? 'Manage event details, publishing, and vendor requests.' : 'Your next events at a glance.'}
          </p>
        </div>
        {!isMyEventsPage && (
          <Link to="/organizer/events" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-800 dark:text-violet-300">
            View all <ExternalLink size={14} />
          </Link>
        )}
      </div>
      {isMyEventsPage && events.length > 0 && (
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Status
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as EventStatus | 'ALL')} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-300 dark:border-white/10 dark:bg-[#171823] dark:text-slate-200">
              <option value="ALL">All statuses</option>
              {(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as EventStatus[]).map(status => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Category
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-300 dark:border-white/10 dark:bg-[#171823] dark:text-slate-200">
              <option value="ALL">All categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Event timing
            <select value={timeFilter} onChange={event => setTimeFilter(event.target.value as typeof timeFilter)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-300 dark:border-white/10 dark:bg-[#171823] dark:text-slate-200">
              <option value="ALL">Any time</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="PAST">Past</option>
            </select>
          </label>
        </div>
      )}
      {visibleEvents.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <CalendarDays size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {hasSearch ? 'Try another search term.' : 'Create your first event to get started.'}
          </p>
          {!hasSearch && (
            <Link to="/organizer/events/create" className="mt-4 inline-flex">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700"><Plus size={15} /> Create event</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[790px] text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Event</th>
                  <th scope="col" className="px-4 py-3.5">Date</th>
                  <th scope="col" className="px-4 py-3.5">Venue</th>
                  <th scope="col" className="px-4 py-3.5">Registered / capacity</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                {visibleEvents.map(event => (
                  <tr key={event.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.025]">
                    <td className="px-6 py-4">
                      <p className="max-w-56 truncate font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.category}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(event.startTime)}</td>
                    <td className="max-w-44 truncate px-4 py-4 text-slate-600 dark:text-slate-300" title={event.venue}>{event.venue}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.max(0, event.capacity - event.availableCapacity)}</span>
                      <span className="text-slate-500 dark:text-slate-400"> / {event.capacity}</span>
                    </td>
                    <td className="px-4 py-4"><Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge></td>
                    <td className="px-4 py-4 text-right">
                      <EventActions
                        event={event}
                        submitting={submittingId === event.id}
                        cancelling={cancellingId === event.id}
                        onPublish={() => onPublish(event.id)}
                        onCancel={() => onCancel(event)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden dark:divide-white/[0.07]">
            {visibleEvents.map(event => (
              <article key={event.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-white">{event.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(event.startTime)}</p>
                  </div>
                  <Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge>
                </div>
                <p className="truncate text-sm text-slate-600 dark:text-slate-300">{event.venue}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {Math.max(0, event.capacity - event.availableCapacity)} / {event.capacity} places
                  </p>
                  <EventActions
                    event={event}
                    submitting={submittingId === event.id}
                    cancelling={cancellingId === event.id}
                    onPublish={() => onPublish(event.id)}
                    onCancel={() => onCancel(event)}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function EventActions({
  event,
  submitting,
  cancelling,
  onPublish,
  onCancel,
}: {
  event: Event;
  submitting: boolean;
  cancelling: boolean;
  onPublish: () => void;
  onCancel: () => void;
}) {
  return (
    <details className="group relative inline-block text-left">
      <summary
        aria-label={`Actions for ${event.title}`}
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <Ellipsis size={19} />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#222330]">
        {(['DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'PUBLISHED'].includes(event.status)) && (
          <Link to={`/organizer/events/${event.id}/edit`} className="block rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
            {event.status === 'PUBLISHED' ? 'Edit published event' : event.status === 'PENDING_APPROVAL' ? 'Edit pending event' : event.status === 'REJECTED' ? 'Correct event' : 'Edit draft'}
          </Link>
        )}
        <Link to={`/organizer/events/${event.id}/vendors`} className="block rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
          Vendor applications
        </Link>
        {(['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(event.status)) && (
          <button type="button" disabled={submitting} onClick={onPublish} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/10">
            {submitting ? 'Publishing…' : 'Publish event'}
          </button>
        )}
        {event.status === 'PUBLISHED' && (
          <button type="button" disabled={cancelling} onClick={onCancel} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
            {cancelling ? 'Cancelling…' : 'Cancel event'}
          </button>
        )}
      </div>
    </details>
  );
}

function RecentBookingsPanel() {
  return (
    <section id="recent-bookings" className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-3">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/10 sm:px-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent bookings</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Latest attendee reservations across your events.</p>
      </div>
      <div className="px-5 py-9 text-center sm:px-6">
        <Users size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Booking details aren’t available yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
          The current booking API does not provide organizer booking records or attendee details.
        </p>
      </div>
    </section>
  );
}

function QuickActionsPanel() {
  const actions = [
    { label: 'Create event', icon: Plus, to: '/organizer/events/create' },
    { label: 'View attendees', icon: Users, to: '/organizer/attendees' },
    { label: 'Manage tickets', icon: Ticket, to: '/organizer/tickets' },
    { label: 'Vendor applications', icon: CalendarDays, to: '/organizer/vendor-applications' },
    { label: 'View reports', icon: ExternalLink, to: '/organizer/reports' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-2">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick actions</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Get to common tasks faster.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-violet-100 hover:bg-violet-50/70 hover:text-violet-700 dark:border-white/[0.07] dark:text-slate-300 dark:hover:border-violet-400/20 dark:hover:bg-violet-500/10 dark:hover:text-violet-200">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><Icon size={16} /></span>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
