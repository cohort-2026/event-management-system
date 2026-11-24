import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, MapPin, ScanLine, RotateCw } from 'lucide-react';
import PageWrapper from '@/layouts/PageWrapper';
import OrganizerSidebar from '@/layouts/OrganizerSidebar';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '@/components/shared';
import { getMyEvents } from '@/features/events/services/eventService';
import type { Event } from '@/types/event';

const errorMessage = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data?.message ?? 'Your events could not be loaded.'
  : 'Your events could not be loaded.';

const formatDate = (value: string) => new Date(value).toLocaleString('en-ZA', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

export default function CheckInEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then(response => { if (active) setEvents(response.data.data); })
      .catch(loadError => { if (active) setError(errorMessage(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const now = Date.now();
  const liveEvents = events.filter(event =>
    event.status === 'PUBLISHED' && new Date(event.startTime).getTime() <= now && new Date(event.endTime).getTime() >= now,
  );

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader
            title="Event check-in"
            description="Choose a live event to open its secure ticket scanner or look up guests manually."
          />

          <section aria-labelledby="live-events-heading" className="mt-7">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="live-events-heading" className="text-lg font-bold text-neutral-900">Live events</h2>
                <p className="mt-1 text-sm text-neutral-500">Only published events currently in progress are available.</p>
              </div>
              <Link to="/organizer/events" className="min-h-10 inline-flex items-center rounded-lg px-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-600">My events</Link>
            </div>

            {loading ? <LoadingState label="Loading your live events" className="min-h-48" /> : error ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                <p>{error}</p>
                <button type="button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 font-semibold hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-600"><RotateCw className="size-4" />Try again</button>
              </div>
            ) : liveEvents.length ? (
              <ul className="grid gap-4 xl:grid-cols-2">
                {liveEvents.map(event => (
                  <li key={event.id}>
                    <article className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <StatusBadge status="PUBLISHED" />
                        <h3 className="mt-3 truncate text-base font-bold text-neutral-900">{event.title}</h3>
                        <p className="mt-2 flex items-center gap-2 truncate text-sm text-neutral-600"><MapPin className="size-4 shrink-0 text-neutral-400" />{event.venue}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500"><CalendarDays className="size-3.5" /><span>{formatDate(event.startTime)}</span><span aria-hidden="true">–</span><Clock3 className="size-3.5" /><span>{formatDate(event.endTime)}</span></p>
                      </div>
                      <Link
                        to={`/organizer/events/${event.id}/check-in`}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                      >
                        <ScanLine className="size-4" />Open scanner
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<ScanLine className="size-6" />}
                title="No events are open for check-in"
                description="A published event appears here while it is in progress. Check your event schedule or refresh the list."
                action={<button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"><RotateCw className="size-4" />Refresh live events</button>}
              />
            )}
          </section>
        </main>
      </div>
    </PageWrapper>
  );
}
