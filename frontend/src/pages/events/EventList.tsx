import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import EventCard from '@/components/ui/EventCard';
import Input from '@/components/ui/Input';
import { publishedMockEvents } from '@/data/mockEvents';
import type { EventListParams } from '@/types/event';

const PAGE_SIZE = 12;

export default function EventList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [location, setLocation] = useState('');
  const [free, setFree] = useState('');
  const [sort, setSort] = useState<NonNullable<EventListParams['sort']>>('date');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categories = [...new Set(publishedMockEvents.map(event => event.category))].sort();
  const locations = [...new Set(publishedMockEvents.map(event => event.venue))].sort();
  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = publishedMockEvents.filter(event => {
      const eventDate = event.date.slice(0, 10);
      return (
        (!keyword || `${event.title} ${event.description}`.toLowerCase().includes(keyword)) &&
        (!category || event.category === category) &&
        (!location || event.venue === location) &&
        (!free || event.isFree === (free === 'true')) &&
        (!dateFrom || eventDate >= dateFrom) &&
        (!dateTo || eventDate <= dateTo)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === 'popularity') return (b.popularity ?? 0) - (a.popularity ?? 0);
      if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt);
      return a.date.localeCompare(b.date);
    });
  }, [search, category, location, free, dateFrom, dateTo, sort]);
  const visibleEvents = filteredEvents.slice(0, visibleCount);

  return (
    <PageWrapper>
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-brand-700 transition-colors hover:text-brand-900 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Go back to the previous page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>
        <h1 className="text-3xl font-bold text-neutral-900 mt-4">Explore events</h1>
        <p className="text-neutral-500 mt-1">Discover published events and find your next experience.</p>
        <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          Sample events while live event data is being connected
        </p>
      </div>

      <section aria-label="Search and filter events" className="mb-7 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label="Search"
            placeholder="Event name or keyword"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
          <Select label="Category" value={category} onChange={value => {
            setCategory(value);
            setVisibleCount(PAGE_SIZE);
          }}>
            <option value="">All categories</option>
            {categories.map(value => <option key={value} value={value}>{value}</option>)}
          </Select>
          <Select label="Location" value={location} onChange={value => {
            setLocation(value);
            setVisibleCount(PAGE_SIZE);
          }}>
            <option value="">All locations</option>
            {locations.map(value => <option key={value} value={value}>{value}</option>)}
          </Select>
          <Select label="Price" value={free} onChange={value => {
            setFree(value);
            setVisibleCount(PAGE_SIZE);
          }}>
            <option value="">Free and paid</option>
            <option value="true">Free events</option>
            <option value="false">Paid events</option>
          </Select>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Date from
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={event => {
                setDateFrom(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Date to
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={event => {
                setDateTo(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <Select label="Sort by" value={sort} onChange={value => {
            setSort(value as NonNullable<EventListParams['sort']>);
            setVisibleCount(PAGE_SIZE);
          }}>
            <option value="date">Date</option>
            <option value="popularity">Popularity</option>
            <option value="recent">Recently published</option>
          </Select>
        </div>
      </section>

      <div className="mb-4">
        <p className="text-sm text-neutral-500" aria-live="polite">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {visibleEvents.length > 0 ? (
        <>
          <div className="card-grid">
            {visibleEvents.map(event => <EventCard key={event.id} event={event} />)}
          </div>
          {visibleCount < filteredEvents.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
                className="rounded-xl border border-brand-200 bg-white px-6 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
              >
                Load more events
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <svg className="h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 0v4m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-medium text-neutral-700">No events found</p>
          <p className="mt-1 text-sm text-neutral-400">Try adjusting your search or filters.</p>
        </div>
      )}

    </PageWrapper>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const id = `event-filter-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      <select
        id={id}
        value={value}
        onChange={event => {
          onChange(event.target.value);
        }}
        className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {children}
      </select>
    </label>
  );
}
