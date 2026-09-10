import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import EventCard from '@/components/ui/EventCard';
import Input from '@/components/ui/Input';
import type { Event } from '@/types/event';

const MOCK_EVENTS: Event[] = [
  { id: '1', title: 'Annual Tech Summit 2025', description: 'A full-day conference bringing together technology leaders, innovators and developers to explore the future of software.', category: 'Technology', venue: 'Sandton Convention Centre, Johannesburg', date: '2025-09-15T09:00:00Z', capacity: 500, availableCapacity: 142, isFree: false, price: 350, status: 'PUBLISHED', organizerId: 'org1', createdAt: '', updatedAt: '' },
  { id: '2', title: 'Leadership & Management Workshop', description: 'An intensive one-day workshop designed to sharpen leadership skills and management techniques for mid-level professionals.', category: 'Training', venue: 'The Pivot, Montecasino, Fourways', date: '2025-08-22T08:30:00Z', capacity: 80, availableCapacity: 23, isFree: false, price: 1200, status: 'PUBLISHED', organizerId: 'org1', createdAt: '', updatedAt: '' },
  { id: '3', title: 'Startup Networking Evening', description: 'Connect with founders, investors and ecosystem builders over drinks and light snacks in a relaxed setting.', category: 'Networking', venue: 'Workshop17, Rosebank', date: '2025-08-08T18:00:00Z', capacity: 150, availableCapacity: 67, isFree: true, status: 'PUBLISHED', organizerId: 'org2', createdAt: '', updatedAt: '' },
  { id: '4', title: 'Company Year-End Celebration', description: 'Join us for an evening of celebration, awards and entertainment as we close out an incredible year together.', category: 'Company Activity', venue: 'Emperors Palace, Kempton Park', date: '2025-11-28T18:30:00Z', capacity: 300, availableCapacity: 300, isFree: true, status: 'PUBLISHED', organizerId: 'org1', createdAt: '', updatedAt: '' },
  { id: '5', title: 'Digital Marketing Masterclass', description: 'Learn the latest strategies in SEO, paid media, content marketing and analytics from industry practitioners.', category: 'Training', venue: 'Online (Zoom)', date: '2025-09-03T10:00:00Z', capacity: 200, availableCapacity: 88, isFree: false, price: 499, status: 'PUBLISHED', organizerId: 'org3', createdAt: '', updatedAt: '' },
  { id: '6', title: 'Women in Business Breakfast', description: 'An inspiring morning of panel discussions, networking and mentorship opportunities for women in the corporate sector.', category: 'Networking', venue: 'The Saxon Hotel, Sandhurst', date: '2025-08-14T07:30:00Z', capacity: 100, availableCapacity: 12, isFree: false, price: 250, status: 'PUBLISHED', organizerId: 'org2', createdAt: '', updatedAt: '' },
];

const CATEGORIES = ['All', 'Technology', 'Training', 'Networking', 'Company Activity'];

export default function EventList() {
  const navigate = useNavigate();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');

  const filtered = MOCK_EVENTS.filter(e => {
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
      {filtered.length > 0 ? (
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
