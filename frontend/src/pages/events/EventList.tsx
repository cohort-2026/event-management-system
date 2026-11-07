import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import EventCard from '@/components/ui/EventCard';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { getEvents } from '@/services/eventService';
import { getMe } from '@/services/authService';
import type { Event } from '@/types/event';

export default function EventList() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<'All' | 'Open' | 'Closed'>('All');
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

  const categories = useMemo(() => ['All', ...new Set(events.map(event => event.category))], [events]);
  const filtered = events.filter(event => {
    const query = search.trim().toLowerCase();
    const matchSearch = event.title.toLowerCase().includes(query) ||
      event.venue.toLowerCase().includes(query) || event.category.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query);
    const date = new Date(event.startTime);
    const matchesStart = !startDate || date >= new Date(`${startDate}T00:00:00`);
    const matchesEnd = !endDate || date <= new Date(`${endDate}T23:59:59.999`);
    const matchesApplications = applicationStatus === 'All' ||
      (applicationStatus === 'Open' ? date > new Date() : date <= new Date());
    return matchSearch && (category === 'All' || event.category === category) &&
      (!location.trim() || event.venue.toLowerCase().includes(location.trim().toLowerCase())) &&
      matchesStart && matchesEnd && matchesApplications;
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
        <h1 className="mt-4 text-3xl font-bold text-neutral-900">{user?.role === 'VENDOR' ? 'Find Events' : 'Published Events'}</h1>
        <p className="mt-1 text-neutral-500">{user?.role === 'VENDOR' ? 'Explore published events and check vendor application availability.' : 'Browse approved events and event details.'}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium text-neutral-700">
          Search events
          <Input placeholder="Name or keyword" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Location
          <Input placeholder="Venue or location" value={location} onChange={event => setLocation(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-neutral-700">Category
          <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
            {categories.map(value => <option key={value} value={value}>{value === 'All' ? 'All categories' : value}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">From date
          <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium text-neutral-700">To date
          <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" />
        </label>
        {user?.role === 'VENDOR' && (
          <label className="text-sm font-medium text-neutral-700">Vendor applications
            <select value={applicationStatus} onChange={event => setApplicationStatus(event.target.value as 'All' | 'Open' | 'Closed')} className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
              <option value="All">Open and closed</option><option value="Open">Open only</option><option value="Closed">Closed only</option>
            </select>
          </label>
        )}
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <>
          <p className="mb-4 text-sm text-neutral-400">{filtered.length} event{filtered.length !== 1 ? 's' : ''} found</p>
          {filtered.length > 0 ? (
            <div className="card-grid">{filtered.map(event => <EventCard key={event.id} event={event} vendorView={user?.role === 'VENDOR'} vendorApproved={user?.vendorProfileStatus === 'APPROVED'} />)}</div>
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
