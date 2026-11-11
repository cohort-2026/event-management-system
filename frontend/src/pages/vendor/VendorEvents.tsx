import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, MapPin, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getEvents } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function VendorEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (!active) return;
        setCurrentTime(Date.now());
        setEvents(response.data.data);
      })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Published events could not be loaded.'
          : 'Published events could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => [...new Set(events.map(event => event.category))].sort(), [events]);
  const filteredEvents = events.filter(event => {
    const text = `${event.title} ${event.description} ${event.venue} ${event.category}`.toLocaleLowerCase();
    const eventDate = new Date(event.startTime || event.date).toISOString().slice(0, 10);
    return (!search.trim() || text.includes(search.trim().toLocaleLowerCase()))
      && (category === 'all' || event.category === category)
      && (!location.trim() || event.venue.toLocaleLowerCase().includes(location.trim().toLocaleLowerCase()))
      && (!date || eventDate === date);
  });
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  return (
    <VendorPortalLayout businessName={businessName} title="Browse events" subtitle="Find published events and check whether vendor applications are available.">
      <div className="space-y-6">
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative text-xs font-semibold text-slate-600 dark:text-slate-300">
            Search events
            <Search size={16} className="pointer-events-none absolute bottom-3 left-3 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or details" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-normal text-slate-800 outline-none focus:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Category
            <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-800 dark:border-white/10 dark:bg-[#171823] dark:text-white">
              <option value="all">All categories</option>
              {categories.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Location
            <input value={location} onChange={event => setLocation(event.target.value)} placeholder="Search venue" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Event date
            <input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </label>
        </section>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && events.length === 0 ? null : filteredEvents.length ? (
          <section aria-label="Published events" className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredEvents.map(event => {
              const applicationOpen = currentTime !== null
                && new Date(event.startTime || event.date).getTime() > currentTime
                && event.availableVendorStands > 0;
              return (
                <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#171823]">
                  <Link to={`/vendor/events/${event.id}`} aria-label={`View ${event.title} details`}>
                    {event.bannerImageUrl
                      ? <img src={event.bannerImageUrl} alt={`${event.title} cover`} className="h-48 w-full object-cover" />
                      : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-200 text-sm font-semibold text-violet-700 dark:from-violet-950 dark:to-indigo-950 dark:text-violet-200">{event.category}</div>}
                  </Link>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{event.category}</p>
                        <h2 className="mt-1 line-clamp-2 text-lg font-bold text-slate-900 dark:text-white">{event.title}</h2>
                      </div>
                      <Badge variant={applicationOpen ? 'success' : 'default'}>{applicationOpen ? 'Applications open' : 'Applications closed'}</Badge>
                    </div>
                    <p className="line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{event.description}</p>
                    <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                      <p className="flex items-center gap-2"><CalendarDays size={15} />{new Date(event.startTime || event.date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="flex items-center gap-2"><MapPin size={15} /><span className="truncate">{event.venue || 'Venue unavailable'}</span></p>
                      <p>{event.availableVendorStands} of {event.vendorStandsAvailable} vendor spaces available</p>
                    </div>
                    <Link to={`/vendor/events/${event.id}`} className="inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300">View event details →</Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#171823]">
            <h2 className="font-semibold text-slate-900 dark:text-white">{events.length ? 'No matching events' : 'No published events yet'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust the filters or check again later for published events.</p>
          </div>
        )}
      </div>
    </VendorPortalLayout>
  );
}
