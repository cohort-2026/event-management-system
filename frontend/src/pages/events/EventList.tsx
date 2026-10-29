import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import EventCard from '@/components/ui/EventCard';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { getEvents } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const categories = useMemo(() => ['All', ...new Set(events.map(event => event.category))], [events]);
  const filtered = events.filter(event => {
    const query = search.trim().toLowerCase();
    const matchSearch = event.title.toLowerCase().includes(query) ||
      event.venue.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query);
    return matchSearch && (category === 'All' || event.category === category);
  });

  return (
    <PageWrapper>
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Go back to the previous page"
        >
          <span aria-hidden="true">←</span> Previous
        </button>
        <h1 className="mt-4 text-3xl font-bold text-neutral-900">Upcoming Events</h1>
        <p className="mt-1 text-neutral-500">Browse and register for approved events happening near you.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="max-w-sm flex-1">
          <Input placeholder="Search events or venues…" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                category === value
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-brand-400 hover:text-brand-600'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <>
          <p className="mb-4 text-sm text-neutral-400">{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
          {filtered.length > 0 ? (
            <div className="card-grid">{filtered.map(event => <EventCard key={event.id} event={event} />)}</div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-medium text-neutral-700">No approved events found</p>
              <p className="mt-1 text-sm text-neutral-400">Try adjusting your search or category filter.</p>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
