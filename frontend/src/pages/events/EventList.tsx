import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import EventCard from '@/components/ui/EventCard';
import Input from '@/components/ui/Input';
import { useEvents } from '@/hooks/useEvents';

const CATEGORIES = ['All', 'Technology', 'Training', 'Networking', 'Company Activity'];

export default function EventList() {
  const navigate = useNavigate();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');
  const { events, loading, error } = useEvents();

  const filtered = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
                        e.venue.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'All' || e.category === category;
    return matchSearch && matchCat;
  });

  return (
    <PageWrapper>
      {/* Page header */}
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

        <h1 className="text-3xl font-bold text-neutral-900 mt-4">Upcoming Events</h1>
        <p className="text-neutral-500 mt-1">Browse and register for events happening near you.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search events or venues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
                ${category === c
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400 hover:text-brand-600'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-neutral-400 mb-4">
        {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Grid */}
      {loading ? (
        <p className="py-12 text-center text-neutral-500">Loading events...</p>
      ) : error ? (
        <p role="alert" className="py-12 text-center text-rose-600">{error}</p>
      ) : filtered.length > 0 ? (
        <div className="card-grid">
          {filtered.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-medium text-neutral-700">No events found</p>
          <p className="text-sm text-neutral-400 mt-1">Try adjusting your search or filter.</p>
        </div>
      )}
    </PageWrapper>
  );
}
