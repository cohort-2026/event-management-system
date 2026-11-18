import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { getEvents } from '@/services/eventService';
import { getMyApplications } from '@/services/vendorService';
import type { Event } from '@/types/event';
import type { VendorApplication } from '@/types/vendor';

const bannerThemes = [
  'bg-gradient-to-br from-[#ff8c63] via-[#f14b2d] to-[#f97316]',
  'bg-gradient-to-br from-[#171717] via-[#25211f] to-[#342823]',
  'bg-gradient-to-br from-[#111116] via-[#75152e] to-[#29101b]',
  'bg-gradient-to-br from-[#9b25eb] via-[#d332a4] to-[#ec4c89]',
  'bg-gradient-to-br from-[#0f9b78] via-[#0d957a] to-[#089a8c]',
  'bg-gradient-to-br from-[#bcbcbc] via-[#a5a5a5] to-[#888]',
];

export default function EventList({ upcomingOnly = false }: { upcomingOnly?: boolean }) {
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuth();
  const standsOnly = searchParams.get('stands') === 'available';
  const [events, setEvents] = useState<Event[]>([]);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
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
  const [applicationError, setApplicationError] = useState('');

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

  return (
    <PageWrapper backgroundClassName="bg-gradient-to-br from-rose-50 via-white to-orange-50">
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
              <p className="mt-1 text-sm text-neutral-400">Try adjusting your search or category filter.</p>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}

function EventCard({
  event,
  variant,
  application,
}: {
  event: Event;
  variant: number;
  application?: VendorApplication;
}) {
  const eventDate = new Date(event.startTime);
  const month = eventDate.toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase();
  const day = eventDate.toLocaleDateString('en-ZA', { day: '2-digit' });
  const isApplied = Boolean(application);
  const applicationLabel = application?.status === 'PENDING_REVIEW'
    ? 'Applied · under review'
    : application?.status === 'APPROVED'
      ? 'Applied · approved'
      : 'Applied · rejected';

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
      <div className={`relative h-[68px] overflow-hidden ${bannerThemes[variant]}`}>
        {event.bannerImageUrl ? (
          <img src={event.bannerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <EventArtwork variant={variant} />
        )}
        <div className="absolute left-1 top-1 flex h-[23px] w-[23px] flex-col items-center justify-center rounded-md bg-white text-[#222] shadow-sm">
          <span className="text-[10px] font-bold leading-3 text-[#e11d48]">{month}</span>
          <span className="text-[14px] font-extrabold leading-4">{day}</span>
        </div>
      </div>

      <div className="p-2">
        <h2 className="truncate text-[14px] font-extrabold leading-4 text-[#202020]">{event.title}</h2>
        <p className="mt-0.5 truncate text-[12px] leading-[10px] text-[#777]">
          {event.venue} · {event.capacity.toLocaleString()} attendees expected
        </p>

        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-[#f7f7f7] px-2 py-1.5">
          <div>
            <p className="text-[10px] leading-3 text-[#777]">Stands left</p>
            <p className="text-[12px] font-bold leading-[10px] text-[#333]">
              {event.availableVendorStands} of {event.vendorStandsAvailable}
            </p>
          </div>
          <div>
            <p className="text-[10px] leading-3 text-[#777]">Rate</p>
            <p className="text-[12px] font-bold leading-[10px] text-[#333]">
              R{event.vendorStandRatePerSqm.toLocaleString('en-ZA')}/m²
            </p>
          </div>
        </div>

        {isApplied ? (
          <div className="mt-1.5 flex h-[21px] items-center justify-center rounded-md border border-[#ffe3a2] bg-[#fff9e8] text-[12px] font-bold text-[#c96a00]">
            {applicationLabel}
          </div>
        ) : event.availableVendorStands <= 0 ? (
          <div className="mt-1.5 flex h-[21px] items-center justify-center rounded-md bg-[#f1f1f1] text-[12px] font-semibold text-[#888]">
            All stands taken
          </div>
        ) : (
          <Link
            to={`/vendor/events/${event.id}/apply`}
            className="mt-1.5 flex h-[21px] items-center justify-center rounded-md bg-[#111] text-[12px] font-bold text-white transition hover:bg-[#333]"
          >
            Apply for a stand
          </Link>
        )}
      </div>
    </article>
  );
}

function EventArtwork({ variant }: { variant: number }) {
  if (variant === 0) {
    return (
      <>
        <span className="absolute -left-5 top-6 h-16 w-16 rounded-full bg-[#ffb45c]" />
        <span className="absolute left-[27%] top-8 h-20 w-20 rounded-full bg-[#ad2c18]/75" />
        <span className="absolute right-2 -top-5 h-12 w-12 rounded-full bg-[#ffb46b]/70" />
      </>
    );
  }
  if (variant === 1) {
    return <span className="absolute left-1/2 top-7 h-20 w-20 -translate-x-1/2 rounded-full bg-[#ff7900]" />;
  }
  if (variant === 2) {
    return <span className="absolute -right-4 -top-7 h-24 w-24 rounded-full bg-[#961532]/90 blur-sm" />;
  }
  if (variant === 3) {
    return <span className="absolute inset-0 opacity-70" style={{ backgroundImage: 'repeating-radial-gradient(circle at 16% 80%, transparent 0 5px, rgb(255 255 255 / 0.24) 6px 8px)' }} />;
  }
  if (variant === 4) {
    return (
      <>
        <span className="absolute -left-2 -top-6 h-12 w-12 rounded-full bg-[#86d35b]" />
        <span className="absolute right-4 top-5 h-14 w-14 rounded-full bg-[#45b6a4]" />
      </>
    );
  }
  return (
    <>
      <span className="absolute right-5 -top-4 h-14 w-14 rounded-full bg-white/60" />
      <span className="absolute left-10 top-8 h-7 w-7 rounded-full bg-white/35" />
    </>
  );
}

function FilterChip({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-[21px] shrink-0 items-center rounded-full border px-2 text-[12px] font-semibold transition ${
        active
          ? 'border-[#171717] bg-[#171717] text-white'
          : 'border-[#e2e2e2] bg-white text-[#444] hover:bg-[#f5f5f5]'
      }`}
    >
      {label}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 shrink-0" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}
