import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal } from 'lucide-react';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import EventCard from '@/components/app/EventCard';
import Input from '@/components/legacy/Input';
import Spinner from '@/components/legacy/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';
import NotificationBell from '@/components/layout/NotificationBell';
import { useAuth } from '@/context/useAuth';
import { getEvents } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function EventList({ upcomingOnly = false }: { upcomingOnly?: boolean }) {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const standsOnly = searchParams.get('stands') === 'available';
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'name' | 'location'>('all');
  const [category, setCategory] = useState('All');
  const [datePreset, setDatePreset] = useState<'any' | 'today' | 'next7' | 'month' | 'custom'>('any');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<'All' | 'Open' | 'Closed'>('All');
  const [sortBy, setSortBy] = useState<'soonest' | 'latest' | 'title'>('soonest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (active) setEvents(response.data.data ?? []);
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

  const visibleEvents = events.filter(event => {
    if (upcomingOnly && new Date(event.endTime).getTime() <= Date.now()) return false;
    if (standsOnly && (event.availableVendorStands <= 0 || new Date(event.startTime).getTime() <= Date.now())) return false;
    return true;
  });
  const categories = useMemo(() => ['All', ...new Set(visibleEvents.map(event => event.category))], [visibleEvents]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const nextWeekEnd = new Date(todayEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999);
  const presetStart = datePreset === 'today' || datePreset === 'next7' ? todayStart : datePreset === 'month' ? monthStart : null;
  const presetEnd = datePreset === 'today' ? todayEnd : datePreset === 'next7' ? nextWeekEnd : datePreset === 'month' ? monthEnd : null;
  const filtered = visibleEvents.filter(event => {
    const query = search.trim().toLowerCase();
    const matchesSearch = searchBy === 'all' || !query || (searchBy === 'location'
      ? event.venue.toLowerCase().includes(query)
      : event.title.toLowerCase().includes(query) || event.category.toLowerCase().includes(query) || event.description.toLowerCase().includes(query));
    const date = new Date(event.startTime);
    const effectiveStart = datePreset === 'custom' ? (startDate ? new Date(`${startDate}T00:00:00`) : null) : presetStart;
    const effectiveEnd = datePreset === 'custom' ? (endDate ? new Date(`${endDate}T23:59:59.999`) : null) : presetEnd;
    const matchesStart = !effectiveStart || date >= effectiveStart;
    const matchesEnd = !effectiveEnd || date <= effectiveEnd;
    const matchesApplications = applicationStatus === 'All' ||
      (applicationStatus === 'Open' ? date > new Date() : date <= new Date());
    return matchesSearch && (category === 'All' || event.category === category) &&
      matchesStart && matchesEnd && matchesApplications;
  }).sort((first, second) => {
    if (sortBy === 'title') return first.title.localeCompare(second.title);
    const dateDifference = new Date(first.startTime).getTime() - new Date(second.startTime).getTime();
    return sortBy === 'soonest' ? dateDifference : -dateDifference;
  });

  const clearFilters = () => {
    setSearch('');
    setSearchBy('all');
    setCategory('All');
    setDatePreset('any');
    setStartDate('');
    setEndDate('');
    setApplicationStatus('All');
  };

  const content = (
    <>
      <div className="mb-8 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-100 via-orange-50 to-amber-100 p-5 sm:p-7">
        <h1 className="mt-4 text-3xl font-bold text-neutral-900">{standsOnly ? 'Events with available vendor stands' : user?.role === 'VENDOR' ? 'Find Events' : upcomingOnly ? 'Upcoming Events' : 'Published Events'}</h1>
        <p className="mt-1 text-neutral-500">{standsOnly ? 'Browse published events with open vendor stands.' : user?.role === 'VENDOR' ? 'Explore published events and check vendor application availability.' : upcomingOnly ? 'Browse published events that are still upcoming or in progress.' : 'Browse approved events and event details.'}</p>
      </div>

      <section aria-label="Search and filter events" className="mb-5 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><SlidersHorizontal aria-hidden="true" className="size-4" /></span>
            <div><h2 className="text-sm font-bold text-neutral-900">Find an event</h2><p className="text-xs text-neutral-500">Search and narrow the list</p></div>
          </div>
          <button type="button" onClick={clearFilters} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">Clear filters</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-neutral-700">Search events</span>
            <div className="mt-1.5 space-y-2">
              <select aria-label="Search by" value={searchBy} onChange={event => {
                const nextSearchBy = event.target.value as typeof searchBy;
                setSearchBy(nextSearchBy);
                if (nextSearchBy === 'all') setSearch('');
              }} className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-normal text-neutral-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 sm:text-sm">
                <option value="all">All events</option>
                <option value="name">Name or keyword</option>
                <option value="location">Location</option>
              </select>
              {searchBy !== 'all' && <Input id="event-search" aria-label={searchBy === 'location' ? 'Search by location' : 'Search by name or keyword'} placeholder={searchBy === 'location' ? 'Enter a venue or city' : 'Enter a name or keyword'} value={search} onChange={event => setSearch(event.target.value)} className="!h-10 !min-w-0 !rounded-lg !border-neutral-200 !bg-neutral-50 !px-3 !py-2 !text-sm focus:!border-rose-400 focus:!bg-white focus:!ring-4 focus:!ring-rose-100" />}
            </div>
          </div>
          <label className="block text-xs font-semibold text-neutral-700">Category
          <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal text-neutral-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100">
            {categories.map(value => <option key={value} value={value}>{value === 'All' ? 'All categories' : value}</option>)}
          </select>
          </label>
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-neutral-700">Date
              <select value={datePreset} onChange={event => setDatePreset(event.target.value as typeof datePreset)} className="mt-1.5 block h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal text-neutral-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100">
                <option value="any">Any date</option>
                <option value="today">Today</option>
                <option value="next7">Next 7 days</option>
                <option value="month">This month</option>
                <option value="custom">Custom range</option>
              </select>
            </label>
            {datePreset === 'custom' && <div className="mt-2 grid grid-cols-1 gap-2">
              <label className="min-w-0 text-[11px] font-medium text-neutral-600">From
                <input type="date" value={startDate} onChange={event => {
                  const nextStartDate = event.target.value;
                  setStartDate(nextStartDate);
                  if (endDate && nextStartDate > endDate) setEndDate(nextStartDate);
                }} className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-normal text-neutral-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 sm:px-3 sm:text-sm" />
              </label>
              <label className="min-w-0 text-[11px] font-medium text-neutral-600">To
                <input type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-normal text-neutral-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 sm:px-3 sm:text-sm" />
              </label>
            </div>}
          </div>
        {user?.role === 'VENDOR' && (
          <label className="text-xs font-semibold text-neutral-700">Vendor applications
            <select value={applicationStatus} onChange={event => setApplicationStatus(event.target.value as 'All' | 'Open' | 'Closed')} className="mt-1.5 block h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal text-neutral-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100">
              <option value="All">Open and closed</option><option value="Open">Open only</option><option value="Closed">Closed only</option>
            </select>
          </label>
        )}
        </div>
      </section>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-neutral-600"><span className="font-bold text-neutral-900">{filtered.length}</span> event{filtered.length !== 1 ? 's' : ''} found</p>
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">Sort by
              <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
                <option value="soonest">Soonest first</option><option value="latest">Latest first</option><option value="title">Name A to Z</option>
              </select>
            </label>
          </div>
          {filtered.length > 0 ? (
            <div className="card-grid">{filtered.map(event => <EventCard key={event.id} event={event} vendorView={user?.role === 'VENDOR' || standsOnly} vendorApproved={user?.vendorProfileStatus === 'APPROVED'} vendorPublicView={standsOnly} />)}</div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-medium text-neutral-700">{standsOnly ? 'No events with available stands found' : upcomingOnly ? 'No upcoming events found' : 'No approved events found'}</p>
              <p className="mt-1 text-sm text-neutral-400">Try a different search.</p>
            </div>
          )}
        </>
      )}
    </>
  );

  if (user?.role === 'ATTENDEE') return <AttendeeLayout>{content}</AttendeeLayout>;
  if (user?.role === 'VENDOR' && pathname === '/vendor/events') {
    return (
      <PageWrapper>
        <div className="vendor-events-page min-h-screen bg-[#fafafa] text-[#171717]">
          <div className="flex min-h-screen">
            <VendorSidebar />
            <div className="min-w-0 flex-1">
              <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <VendorMenuButton />
                  <span className="truncate text-[12px] font-semibold text-[#333]">Find events</span>
                </div>
                <div className="flex items-center gap-2">
                  <VendorSearchField />
                  <NotificationBell appearance="header" />
                </div>
              </header>
              <main className="px-4 pb-6 pt-5 sm:px-6 lg:px-8">{content}</main>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }
  return <PageWrapper>{content}</PageWrapper>;
}

