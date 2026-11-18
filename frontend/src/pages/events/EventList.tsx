import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import PageWrapper from '@/components/layout/PageWrapper';
import EventCard from '@/components/ui/EventCard';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/useAuth';
import { getEvents } from '@/services/eventService';
import { getMe } from '@/services/authService';
import type { Event } from '@/types/event';

type DateFilter = 'any' | 'today' | 'week' | 'month';
type SortOrder = 'soonest' | 'latest';

export default function EventList() {
  const { user, setUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const [selectedTitle, setSelectedTitle] = useState('');
  const [category, setCategory] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [sortOrder, setSortOrder] = useState<SortOrder>('soonest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'VENDOR') {
      getMe().then(response => setUser(response.data.data)).catch(() => undefined);
    }
  }, [user?.role, setUser]);

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (active) setEvents(response.data.data);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Events could not be loaded.')
            : 'Events could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const eventTitles = useMemo(() => [...new Set(events.map(event => event.title))].sort(), [events]);
  const categories = useMemo(() => [...new Set(events.map(event => event.category).filter(Boolean))].sort(), [events]);
  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const query = search.trim().toLowerCase();

    return events
      .filter(event => {
        const eventDate = new Date(event.startTime);
        const matchesSearch = !query ||
          event.title.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query);
        const matchesDate = dateFilter === 'any' ||
          (dateFilter === 'today' && eventDate >= today && eventDate < tomorrow) ||
          (dateFilter === 'week' && eventDate >= weekStart && eventDate < weekEnd) ||
          (dateFilter === 'month' && eventDate >= monthStart && eventDate < monthEnd);

        return matchesSearch &&
          (!selectedTitle || event.title === selectedTitle) &&
          (!category || event.category === category) &&
          matchesDate;
      })
      .sort((first, second) => {
        const difference = new Date(first.startTime).getTime() - new Date(second.startTime).getTime();
        return sortOrder === 'soonest' ? difference : -difference;
      });
  }, [events, search, selectedTitle, category, dateFilter, sortOrder]);

  const clearFilters = () => {
    setSelectedTitle('');
    setCategory('');
    setDateFilter('any');
    setSortOrder('soonest');
    setSearchParams({}, { replace: true });
  };

  const content = (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">{user?.role === 'VENDOR' ? 'Find Events' : 'Published Events'}</h1>
        <p className="mt-1 text-neutral-500">{user?.role === 'VENDOR' ? 'Explore published events and check vendor application availability.' : 'Browse approved events and event details.'}</p>
      </div>

      <section aria-labelledby="event-filters-title" className="mb-6 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="event-filters-title" className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">Find an event</h2>
            <p className="mt-0.5 text-sm text-neutral-500">Search and narrow the list</p>
          </div>
          <button type="button" onClick={clearFilters} className="rounded-md px-2 py-1 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
            Clear filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="min-w-0 text-sm font-semibold text-neutral-700">
            Search events
            <select value={selectedTitle} onChange={event => setSelectedTitle(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal text-neutral-800 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100">
              <option value="">All events</option>
              {eventTitles.map(title => <option key={title} value={title}>{title}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-semibold text-neutral-700">
            Category
            <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal text-neutral-800 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100">
              <option value="">All categories</option>
              {categories.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-semibold text-neutral-700">
            Date
            <select value={dateFilter} onChange={event => setDateFilter(event.target.value as DateFilter)} className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal text-neutral-800 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100">
              <option value="any">Any date</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </label>
        </div>
      </section>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-500" aria-live="polite">{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              Sort by
              <select value={sortOrder} onChange={event => setSortOrder(event.target.value as SortOrder)} className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100">
                <option value="soonest">Soonest first</option>
                <option value="latest">Latest first</option>
              </select>
            </label>
          </div>
          {filtered.length > 0 ? (
            <div className="card-grid">{filtered.map(event => <EventCard key={event.id} event={event} vendorView={user?.role === 'VENDOR'} vendorApproved={user?.vendorProfileStatus === 'APPROVED'} />)}</div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-medium text-neutral-700">No approved events found</p>
              <p className="mt-1 text-sm text-neutral-400">Try a different search.</p>
            </div>
          )}
        </>
      )}
    </>
  );

  if (user?.role === 'ATTENDEE') return <AttendeeLayout>{content}</AttendeeLayout>;
  return <PageWrapper>{content}</PageWrapper>;
}
