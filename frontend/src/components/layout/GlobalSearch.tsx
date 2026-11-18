import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getEvents, getEventRegistrations, getMyEvents, type EventRegistration } from '@/services/eventService';
import { getUsers } from '@/services/userService';
import type { Event } from '@/types/event';
import type { User } from '@/types/user';

interface SearchResult {
  id: string;
  title: string;
  detail: string;
  kind: 'Event' | 'Person';
  to: string;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      setResults([]);
      setMessage('Enter a name, email, or event title to search.');
      return;
    }

    setSearching(true);
    setMessage('');
    try {
      const eventsResponse = user?.role === 'ORGANIZER' ? await getMyEvents() : await getEvents();
      const events = eventsResponse.data.data;
      const eventResults: SearchResult[] = events
        .filter((item: Event) => item.title.toLowerCase().includes(normalizedQuery))
        .slice(0, 5)
        .map((item: Event) => ({ id: item.id, title: item.title, detail: 'Event', kind: 'Event', to: `/events/${item.id}` }));
      let userResults: SearchResult[] = [];
      if (user?.role === 'ADMIN') {
        const usersResponse = await getUsers();
        userResults = usersResponse.data
          .filter((item: User) => `${item.firstname} ${item.lastname} ${item.email}`.toLowerCase().includes(normalizedQuery))
          .slice(0, 5)
          .map((item: User) => ({
            id: item.id,
            title: `${item.firstname} ${item.lastname}`,
            detail: `${item.email} · ${item.role.toLowerCase()}`,
            kind: 'Person',
            to: item.role === 'ORGANIZER' ? '/admin/users/organizers' : item.role === 'VENDOR' ? '/admin/users/vendors' : '/admin/user-accounts',
          }));
      } else if (user?.role === 'ORGANIZER') {
        const registrations = await Promise.all(events.map((item: Event) => getEventRegistrations(item.id)));
        const uniqueAttendees = new Map<string, { attendee: EventRegistration['attendee']; eventId: string }>();
        registrations.forEach((response, index) => response.data.data.forEach(registration => uniqueAttendees.set(registration.attendee.id, { attendee: registration.attendee, eventId: events[index].id })));
        userResults = [...uniqueAttendees.values()]
          .filter(({ attendee }) => `${attendee.firstname} ${attendee.lastname} ${attendee.email}`.toLowerCase().includes(normalizedQuery))
          .slice(0, 5)
          .map(({ attendee, eventId }) => ({ id: attendee.id, title: `${attendee.firstname} ${attendee.lastname}`, detail: attendee.email, kind: 'Person', to: `/organizer/events/${eventId}/registrations` }));
      }
      const matches = [...eventResults, ...userResults];
      setResults(matches);
      if (!matches.length) setMessage('No matching events or people found.');
    } catch {
      setResults([]);
      setMessage('Search could not be completed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <form onSubmit={search} className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="11" cy="11" r="6" strokeWidth="2" />
          <path d="m16 16 4 4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={query}
        onChange={(event) => { setQuery(event.target.value); setResults([]); setMessage(''); }}
        aria-label="Search events and people"
        placeholder="Search events, people..."
        className="h-11 w-[min(18rem,42vw)] rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      {(results.length > 0 || message || searching) && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {searching ? <p className="px-4 py-3 text-sm text-slate-500">Searching...</p> : message ? <p className="px-4 py-3 text-sm text-slate-500">{message}</p> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {results.map((result) => (
                <li key={`${result.kind}-${result.id}`}>
                  <button type="button" onClick={() => navigate(result.to)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{result.title}</span><span className="block truncate text-xs text-slate-500">{result.detail}</span></span>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">{result.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
