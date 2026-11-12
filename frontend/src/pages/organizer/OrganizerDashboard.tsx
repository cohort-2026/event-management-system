import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Ellipsis,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import OrganizerPageLayout from '@/components/organizer/OrganizerPageLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { cancelEvent, getMyEventRevenue, getMyEvents, publishEvent } from '@/services/eventService';
import type { OrganizerRevenuePoint } from '@/services/eventService';
import type { Event, EventStatus } from '@/types/event';
import type { BadgeVariant } from '@/components/ui/Badge';

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
const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dashboardOpenedAt = Date.now();

export default function OrganizerDashboard() {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/+$/, '') || '/';
  const isMyEventsPage = currentPath === '/organizer/events';
  const isAnalyticsPage = currentPath === '/organizer/analytics';
  const [events, setEvents] = useState<Event[]>([]);
  const [revenue, setRevenue] = useState<OrganizerRevenuePoint[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  useEffect(() => {
    let active = true;
    getMyEventRevenue()
      .then(response => {
        if (active) setRevenue(response.data.data);
      })
      .catch(loadError => {
        if (active) {
          setRevenueError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Revenue data could not be loaded.')
            : 'Revenue data could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setRevenueLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return events.filter(event => {
      if (query && ![event.title, event.venue, event.category, event.status].some(value =>
        value.toLocaleLowerCase().includes(query),
      )) return false;
      if (statusFilter !== 'ALL' && event.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && event.category !== categoryFilter) return false;
      const eventDate = localDateKey(new Date(event.startTime));
      if (dateFrom && eventDate < dateFrom) return false;
      if (dateTo && eventDate > dateTo) return false;
      return true;
    });
  }, [events, search, statusFilter, categoryFilter, dateFrom, dateTo]);
  const filteredRevenue = useMemo(() => {
    const filteredEventIds = new Set(filteredEvents.map(event => event.id));
    return revenue.filter(point => filteredEventIds.has(point.eventId));
  }, [filteredEvents, revenue]);

  const upcomingEvents = useMemo(() => filteredEvents
    .filter(event => new Date(event.startTime).getTime() >= dashboardOpenedAt)
    .filter(event => event.status !== 'CANCELLED' && event.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()), [filteredEvents]);

  const registeredPlaces = filteredEvents.reduce(
    (total, event) => total + Math.max(0, event.capacity - event.availableCapacity),
    0,
  );
  const publishedEvents = filteredEvents.filter(event => event.status === 'PUBLISHED').length;
  const revenueByCurrency = filteredRevenue.reduce<Record<string, number>>((totals, point) => {
    totals[point.currency] = (totals[point.currency] ?? 0) + point.revenue;
    return totals;
  }, {});
  const revenueCurrencies = Object.keys(revenueByCurrency);
  const revenueValue = revenueLoading
    ? '…'
    : revenueError
      ? 'Unavailable'
      : revenueCurrencies.length === 1
        ? `${revenueCurrencies[0]} ${revenueByCurrency[revenueCurrencies[0]].toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : revenueCurrencies.length > 1 ? 'Multiple currencies' : '—';
  const revenueNote = revenueLoading
    ? 'Loading paid booking totals'
    : revenueError
      ? 'Revenue data could not be loaded'
      : filteredRevenue.length ? 'Across paid bookings' : 'No paid bookings yet';
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
    { label: 'Total events', value: filteredEvents.length, note: 'Matching your filters', icon: CalendarDays, color: 'blue', direction: null },
    { label: 'Registrations', value: registeredPlaces.toLocaleString(), note: 'Across all your events', icon: Users, color: 'green', direction: null },
    { label: 'Published events', value: publishedEvents, note: 'Currently published', icon: Ticket, color: 'amber', direction: null },
    { label: 'Revenue', value: revenueValue, note: revenueNote, icon: CircleDollarSign, color: 'violet', direction: null },
  ];

  const pageTitle = isMyEventsPage
    ? 'My Events'
    : isAnalyticsPage
      ? 'Event Analytics'
      : 'Event dashboard';
  const pageSubtitle = isMyEventsPage
    ? 'Manage your events and track their status.'
    : isAnalyticsPage
      ? 'Review event registrations and status performance.'
      : "Here's what's happening with your events.";

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
              <Plus size={17} /> New event
            </Button>
          </Link>
        </section>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}

        <section aria-label="Organizer statistics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {statCards.map(card => <StatCard key={card.label} {...card} />)}
        </section>

        {!isMyEventsPage && (
          <section aria-label="Dashboard filters" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171823]">
            <label className="min-w-36 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Status
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as EventStatus | 'ALL')}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-[#10111a] dark:text-slate-100 dark:focus:ring-violet-500/20"
              >
                <option value="ALL">All statuses</option>
                {(['PUBLISHED', 'DRAFT', 'PENDING_APPROVAL', 'REJECTED', 'CANCELLED', 'COMPLETED'] as EventStatus[]).map(status => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="min-w-36 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Category
              <select
                value={categoryFilter}
                onChange={event => setCategoryFilter(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-[#10111a] dark:text-slate-100 dark:focus:ring-violet-500/20"
              >
                <option value="ALL">All categories</option>
                {[...new Set(events.map(event => event.category))].sort((a, b) => a.localeCompare(b)).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="min-w-36 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              From date
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={event => setDateFrom(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-[#10111a] dark:text-slate-100 dark:focus:ring-violet-500/20"
              />
            </label>
            <label className="min-w-36 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              To date
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={event => setDateTo(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-[#10111a] dark:text-slate-100 dark:focus:ring-violet-500/20"
              />
            </label>
            <div className="flex h-10 items-center gap-3">
              <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {filteredEvents.length} of {events.length} events
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                }}
                disabled={statusFilter === 'ALL' && categoryFilter === 'ALL' && !dateFrom && !dateTo && !search}
                className="whitespace-nowrap text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:cursor-default disabled:text-slate-400 dark:text-violet-300 dark:hover:text-violet-200 dark:disabled:text-slate-600"
              >
                Reset filters
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-blue-900 bg-[#10234a] dark:border-white/10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {!isMyEventsPage && (
              <>
                <div className="grid gap-5 xl:grid-cols-2">
                  <RegistrationsByCategoryChart events={filteredEvents} />
                  <EventsByStatusChart events={filteredEvents} />
                  <RegistrationsOverTimeChart events={filteredEvents} />
                  <RegistrationCapacityScatterChart events={filteredEvents} />
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <UpcomingEventsPanel events={upcomingEvents} onSelect={setSelectedEvent} />
                  {!isAnalyticsPage && <OrganizerCalendar events={filteredEvents} onSelect={setSelectedEvent} />}
                </div>
                {isAnalyticsPage && (
                  <OrganizerCalendar events={filteredEvents} onSelect={setSelectedEvent} />
                )}
              </>
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
                <RecentActivityPanel events={filteredEvents} />
                <QuickActionsPanel />
              </div>
            )}
          </>
        )}
      </div>
      {selectedEvent && <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </OrganizerPageLayout>
  );
}

function RegistrationsByCategoryChart({ events }: { events: Event[] }) {
  const registrationsByCategory = Object.entries(events.reduce<Record<string, number>>((totals, event) => {
    totals[event.category] = (totals[event.category] ?? 0)
      + Math.max(0, event.capacity - event.availableCapacity);
    return totals;
  }, {}))
    .map(([category, registrations]) => ({ category, registrations }))
    .sort((first, second) => second.registrations - first.registrations);

  return (
    <section
      aria-label="Registrations by category"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:p-5"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Registrations by category</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Compare registered places across event categories.
        </p>
      </div>
      {registrationsByCategory.length ? (
        <div className="mt-3 h-48 w-full" role="img" aria-label="Bar chart comparing registrations by event category">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={registrationsByCategory}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 12, bottom: 4 }}
            >
              <CartesianGrid stroke="#e8eaf0" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(124, 58, 237, 0.08)' }}
                contentStyle={{ border: '1px solid #e8e7ef', borderRadius: 12 }}
                formatter={value => [value, 'Registered places']}
              />
              <Bar dataKey="registrations" name="Registered places" fill="#7c3aed" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No event categories match the selected filters.
        </p>
      )}
    </section>
  );
}

function EventsByStatusChart({ events }: { events: Event[] }) {
  const statusColors: Record<EventStatus, string> = {
    PUBLISHED: '#10b981',
    DRAFT: '#64748b',
    PENDING_APPROVAL: '#f59e0b',
    REJECTED: '#f43f5e',
    CANCELLED: '#94a3b8',
    COMPLETED: '#06b6d4',
  };
  const statusCounts = Object.entries(events.reduce<Partial<Record<EventStatus, number>>>((counts, event) => {
    counts[event.status] = (counts[event.status] ?? 0) + 1;
    return counts;
  }, {}))
    .map(([status, value]) => ({ status: status as EventStatus, value }))
    .sort((first, second) => second.value - first.value);

  return (
    <section
      aria-label="Events by status"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:p-5"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Events by status</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Distribution of events across their current statuses.
        </p>
      </div>
      {statusCounts.length ? (
        <div className="mt-2 grid min-h-48 grid-cols-1 items-center gap-2 sm:grid-cols-2">
          <div className="h-44 w-full" role="img" aria-label="Pie chart showing events by status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  dataKey="value"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusCounts.map(item => (
                    <Cell key={item.status} fill={statusColors[item.status]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ border: '1px solid #e8e7ef', borderRadius: 12 }}
                  formatter={(value, name) => [value, statusLabel(name as EventStatus)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 sm:flex-col sm:gap-2">
            {statusCounts.map(item => (
              <li key={item.status} className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColors[item.status] }} />
                  {statusLabel(item.status)}
                </span>
                <strong className="text-slate-900 dark:text-white">{item.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No event statuses match the selected filters.
        </p>
      )}
    </section>
  );
}

function RegistrationsOverTimeChart({ events }: { events: Event[] }) {
  const registrationsByDate = Object.values(events.reduce<Record<string, {
    date: string;
    label: string;
    registrations: number;
  }>>((totals, event) => {
    const date = new Date(event.startTime);
    const key = localDateKey(date);
    totals[key] ??= {
      date: key,
      label: date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
      registrations: 0,
    };
    totals[key].registrations += Math.max(0, event.capacity - event.availableCapacity);
    return totals;
  }, {})).sort((first, second) => first.date.localeCompare(second.date));

  return (
    <section
      aria-label="Registrations over time"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:p-6"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Registrations over time</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Registered places grouped by scheduled event date.
        </p>
      </div>
      {registrationsByDate.length ? (
        <div className="mt-5 h-64 w-full" role="img" aria-label="Line chart showing registrations by event date">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={registrationsByDate} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e8eaf0" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: '1px solid #e8e7ef', borderRadius: 12 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                formatter={value => [value, 'Registered places']}
              />
              <Line
                type="monotone"
                dataKey="registrations"
                name="Registered places"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No event dates match the selected filters.
        </p>
      )}
    </section>
  );
}

function RegistrationCapacityScatterChart({ events }: { events: Event[] }) {
  const statusColors: Record<EventStatus, string> = {
    PUBLISHED: '#10b981',
    DRAFT: '#64748b',
    PENDING_APPROVAL: '#f59e0b',
    REJECTED: '#f43f5e',
    CANCELLED: '#94a3b8',
    COMPLETED: '#06b6d4',
  };
  const points = events.map(event => ({
    ...event,
    registrations: Math.max(0, event.capacity - event.availableCapacity),
  }));
  const statuses = [...new Set(points.map(event => event.status))];

  return (
    <section
      aria-label="Registrations and capacity"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:p-6"
    >
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Registrations vs capacity</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Compare registered places with event capacity. Points are colored by status.
        </p>
      </div>
      {points.length ? (
        <>
          <div className="mt-5 h-64 w-full" role="img" aria-label="Scatter plot comparing event registrations and capacity">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e8eaf0" />
                <XAxis
                  type="number"
                  dataKey="registrations"
                  name="Registered places"
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="capacity"
                  name="Event capacity"
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ border: '1px solid #e8e7ef', borderRadius: 12 }}
                  formatter={(value, name, item) => [
                    value,
                    `${name} · ${item.payload.title} (${item.payload.category})`,
                  ]}
                />
                {statuses.map(status => (
                  <Scatter
                    key={status}
                    name={statusLabel(status)}
                    data={points.filter(event => event.status === status)}
                    fill={statusColors[status]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {statuses.map(status => (
              <li key={status} className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                {statusLabel(status)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No events match the selected filters.
        </p>
      )}
    </section>
  );
}

function OrganizerCalendar({
  events,
  onSelect,
}: {
  events: Event[];
  onSelect: (event: Event) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDayOffset + 1;
    return day > 0 && day <= daysInMonth ? new Date(year, month, day) : null;
  });
  const eventsByDate = events.reduce<Record<string, Event[]>>((grouped, event) => {
    const date = new Date(event.startTime);
    const key = localDateKey(date);
    (grouped[key] ??= []).push(event);
    return grouped;
  }, {});
  const selectedEvents = eventsByDate[localDateKey(selectedDate)] ?? [];
  const todayKey = localDateKey(new Date());

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(year, month + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  return (
    <section aria-label="Organizer event calendar" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Event calendar</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select a date to see its events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 aria-live="polite" className="min-w-32 text-center text-sm font-semibold text-slate-900 dark:text-white">
            {visibleMonth.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <span key={day} className="py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{day}</span>
        ))}
        {calendarDays.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} aria-hidden="true" className="min-h-12" />;
          const key = localDateKey(date);
          const dayEvents = eventsByDate[key] ?? [];
          const isSelected = key === localDateKey(selectedDate);
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(date)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString('en-ZA', { dateStyle: 'full' })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm transition-colors ${
                isSelected
                  ? 'bg-violet-600 font-semibold text-white'
                  : 'text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/10'
              }`}
            >
              <span className={isToday && !isSelected ? 'font-bold text-violet-600 dark:text-violet-300' : ''}>{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {selectedDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        {selectedEvents.length ? (
          <ul className="mt-3 space-y-2">
            {selectedEvents.map(event => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-violet-50 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{event.title}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{event.venue}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(event.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No events scheduled for this date.</p>
        )}
      </div>
    </section>
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
    violet: 'bg-violet-500/15 text-violet-300',
    blue: 'bg-blue-500/15 text-blue-300',
    green: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
  };

  return (
    <article className="rounded-2xl border border-blue-900 bg-[#10234a] p-5 text-white shadow-sm shadow-black/20 transition hover:border-blue-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="mt-3 break-words text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </span>
      </div>
      <div className="mt-4 flex min-h-5 items-center gap-1.5 text-xs">
        {direction === 'up' && <ArrowUpRight size={14} className="text-emerald-400" />}
        {direction === 'down' && <ArrowDownRight size={14} className="text-rose-400" />}
        <span className="font-medium text-slate-400">{note}</span>
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
    <section id="upcoming-events" className="scroll-mt-24 overflow-hidden rounded-2xl border border-blue-900 bg-[#10234a] text-slate-100 shadow-sm dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-800 px-5 py-4 dark:border-white/10 sm:px-6">
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
        <div className="grid gap-3 border-b border-blue-800 bg-[#0c1c3a] p-4 dark:border-white/10 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-300">
            Status
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as EventStatus | 'ALL')} className="mt-1.5 h-10 w-full rounded-lg border border-blue-700 bg-[#10234a] px-3 text-sm text-slate-100 outline-none focus:border-violet-300">
              <option value="ALL">All statuses</option>
              {(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as EventStatus[]).map(status => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-300">
            Category
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-blue-700 bg-[#10234a] px-3 text-sm text-slate-100 outline-none focus:border-violet-300">
              <option value="ALL">All categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-300">
            Event timing
            <select value={timeFilter} onChange={event => setTimeFilter(event.target.value as typeof timeFilter)} className="mt-1.5 h-10 w-full rounded-lg border border-blue-700 bg-[#10234a] px-3 text-sm text-slate-100 outline-none focus:border-violet-300">
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
              <thead className="bg-[#0c1c3a] text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Event</th>
                  <th scope="col" className="px-4 py-3.5">Date</th>
                  <th scope="col" className="px-4 py-3.5">Venue</th>
                  <th scope="col" className="px-4 py-3.5">Registered / capacity</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800">
                {visibleEvents.map(event => (
                  <tr key={event.id} className="transition-colors hover:bg-blue-900/40">
                    <td className="px-6 py-4">
                      <p className="max-w-56 truncate font-semibold text-slate-100">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{event.category}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-300">{formatDate(event.startTime)}</td>
                    <td className="max-w-44 truncate px-4 py-4 text-slate-300" title={event.venue}>{event.venue}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="font-semibold text-slate-100">{Math.max(0, event.capacity - event.availableCapacity)}</span>
                      <span className="text-slate-400"> / {event.capacity}</span>
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
          <div className="divide-y divide-blue-800 md:hidden">
            {visibleEvents.map(event => (
              <article key={event.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-100">{event.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(event.startTime)}</p>
                  </div>
                  <Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge>
                </div>
                <p className="truncate text-sm text-slate-300">{event.venue}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
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
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-300 transition hover:bg-blue-900 hover:text-white [&::-webkit-details-marker]:hidden"
      >
        <Ellipsis size={19} />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-blue-800 bg-[#10234a] p-1.5 shadow-xl">
        {(['DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'PUBLISHED'].includes(event.status)) && (
          <Link to={`/organizer/events/${event.id}/edit`} className="block rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-blue-900">
            {event.status === 'PUBLISHED' ? 'Edit published event' : event.status === 'PENDING_APPROVAL' ? 'Edit pending event' : event.status === 'REJECTED' ? 'Correct event' : 'Edit draft'}
          </Link>
        )}
        <Link to={`/organizer/events/${event.id}/vendors`} className="block rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-blue-900">
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

function UpcomingEventsPanel({ events, onSelect }: { events: Event[]; onSelect: (event: Event) => void }) {
  const upcoming = events.slice(0, 5);

  return (
    <section aria-label="Upcoming events" className="min-w-0 rounded-2xl border border-blue-900 bg-[#10234a] p-5 text-slate-100 shadow-sm sm:p-6 xl:col-span-2">
      <div className="flex items-start justify-between gap-3 border-b border-blue-800 pb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Upcoming events</h2>
          <p className="mt-1 text-xs text-slate-400">Your next scheduled events</p>
        </div>
        <Link to="/organizer/events" className="text-xs font-semibold text-blue-300 hover:text-blue-200">View all</Link>
      </div>
      {upcoming.length ? (
        <ul className="divide-y divide-blue-800">
          {upcoming.map(event => {
            const registered = Math.max(0, event.capacity - event.availableCapacity);
            const fill = event.capacity > 0 ? Math.min(100, Math.round(registered / event.capacity * 100)) : 0;
            return (
              <li key={event.id}>
                <button type="button" onClick={() => onSelect(event)} className="w-full py-4 text-left transition hover:bg-blue-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-100">{event.title}</span>
                    <Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge>
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{formatDate(event.startTime)}</span>
                    <span className="shrink-0">{registered}/{event.capacity} registered</span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-blue-950">
                    <span className="block h-full rounded-full bg-blue-500" style={{ width: `${fill}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center px-3 text-center">
          <CalendarDays size={26} className="text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-slate-200">No upcoming events</p>
          <p className="mt-1 text-xs text-slate-400">Create an event to see it listed here.</p>
          <Link to="/organizer/events/create" className="mt-4">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus size={14} /> New event</Button>
          </Link>
        </div>
      )}
    </section>
  );
}

function EventDetailsModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const registered = Math.max(0, event.capacity - event.availableCapacity);

  useEffect(() => {
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onMouseDown={eventTarget => {
      if (eventTarget.target === eventTarget.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="event-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-blue-800 bg-[#10234a] p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">{event.category}</p>
            <h2 id="event-details-title" className="mt-1 text-xl font-bold">{event.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close event details" className="rounded-lg p-2 text-slate-400 hover:bg-blue-900 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {event.bannerImageUrl && <img src={event.bannerImageUrl} alt="" className="mt-5 max-h-52 w-full rounded-xl object-cover" />}
        <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-300">{event.description}</p>
        <dl className="mt-5 grid gap-4 border-t border-blue-800 pt-4 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-400">Date and time</dt><dd className="mt-1 text-sm font-medium">{formatDate(event.startTime)}</dd></div>
          <div><dt className="text-xs text-slate-400">Venue</dt><dd className="mt-1 flex items-center gap-1.5 text-sm font-medium"><MapPin size={14} />{event.venue}</dd></div>
          <div><dt className="text-xs text-slate-400">Registration</dt><dd className="mt-1 text-sm font-medium">{registered} of {event.capacity} places</dd></div>
          <div><dt className="text-xs text-slate-400">Status</dt><dd className="mt-1"><Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge></dd></div>
        </dl>
        {event.ticketTypes.length > 0 && (
          <div className="mt-5 border-t border-blue-800 pt-4">
            <h3 className="text-sm font-semibold">Ticket types</h3>
            <ul className="mt-2 space-y-2">
              {event.ticketTypes.map(ticketType => (
                <li key={ticketType.id} className="flex justify-between gap-3 text-sm text-slate-300">
                  <span>{ticketType.name}</span>
                  <span>{ticketType.price === 0 ? 'Free' : ticketType.price.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function RecentActivityPanel({ events }: { events: Event[] }) {
  const recentEvents = [...events].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()).slice(0, 4);

  return (
    <section className="rounded-2xl border border-blue-900 bg-[#10234a] p-5 text-slate-100 shadow-sm xl:col-span-3">
      <h2 className="text-base font-semibold text-slate-100">Recent event activity</h2>
      <p className="mt-1 text-xs text-slate-400">Latest updates to events you manage.</p>
      {recentEvents.length ? (
        <ul className="mt-4 divide-y divide-blue-800">
          {recentEvents.map(event => (
            <li key={event.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><Activity size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-200">{event.title}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{statusLabel(event.status)} · Updated {formatDate(event.updatedAt)}</span>
              </span>
              <Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">Your event updates will appear here.</p>
      )}
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
    <section className="rounded-2xl border border-blue-900 bg-[#10234a] p-5 text-slate-100 shadow-sm xl:col-span-2">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick actions</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Get to common tasks faster.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to} className="flex items-center gap-3 rounded-xl border border-blue-800 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-blue-600 hover:bg-blue-900/60 hover:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-blue-200"><Icon size={16} /></span>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
