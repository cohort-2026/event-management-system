import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import Spinner from '@/components/legacy/Spinner';
import { getMyEvents } from '@/services/eventService';
import type { Event } from '@/types/event';

const errorMessage = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data?.message ?? 'Your events could not be loaded.'
  : 'Your events could not be loaded.';

const formatDate = (value: string) => new Date(value).toLocaleString('en-ZA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
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
    event.status === 'PUBLISHED' &&
    new Date(event.startTime).getTime() <= now &&
    new Date(event.endTime).getTime() >= now,
  );

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader
            title="Check-in"
            topBarSubtitle="Choose one of your live events to open its secure attendee scanner."
            showNavigation={false}
          />

          <section className="mb-6 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-orange-50 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2m2 0h2m-6 3h2m2 0h2m-6 3h6" />
                </svg>
              </span>
              <div>
                <h1 className="text-base font-bold text-neutral-900">Event check-in</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
                  Scan each attendee’s ticket QR code or find a guest by name. Check-in is available while your event is in progress, and every ticket is verified by the server.
                </p>
              </div>
            </div>
          </section>

          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Live events</h2>
              <p className="mt-1 text-sm text-neutral-500">Only events currently open for check-in are shown.</p>
            </div>
            <Link to="/organizer/events" className="shrink-0 text-sm font-semibold text-rose-700 hover:text-rose-800">My events</Link>
          </div>

          {loading ? (
            <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500">
              <Spinner /> Loading your events…
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              <p>{error}</p>
              <button type="button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1); }} className="mt-3 font-semibold underline">Try again</button>
            </div>
          ) : liveEvents.length ? (
            <ul className="grid gap-4 xl:grid-cols-2">
              {liveEvents.map(event => (
                <li key={event.id}>
                  <article className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Live now
                      </span>
                      <h3 className="mt-3 truncate text-base font-bold text-neutral-900">{event.title}</h3>
                      <p className="mt-1 truncate text-sm text-neutral-600">{event.venue}</p>
                      <p className="mt-2 text-xs text-neutral-500">{formatDate(event.startTime)} – {formatDate(event.endTime)}</p>
                    </div>
                    <Link
                      to={`/organizer/events/${event.id}/check-in`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2m2 0h2m-6 3h2m2 0h2m-6 3h6" />
                      </svg>
                      Open scanner
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2m2 0h2m-6 3h2m2 0h2m-6 3h6" />
                </svg>
              </div>
              <h2 className="mt-4 text-base font-bold text-neutral-900">No events are open for check-in</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">When one of your published events is in progress, it will appear here. You can review your event schedule in My events.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Refresh live events</button>
                <Link to="/organizer/events" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">View my events</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
