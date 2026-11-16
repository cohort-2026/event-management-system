import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getEventRegistrations, getMyEvents, type EventRegistration } from '@/services/eventService';
import type { Event, EventStatus } from '@/types/event';

const statuses: Array<{ status: EventStatus; label: string; color: string }> = [
  { status: 'PUBLISHED', label: 'Published', color: '#10b981' },
  { status: 'DRAFT', label: 'Draft', color: '#f59e0b' },
  { status: 'COMPLETED', label: 'Completed', color: '#3b82f6' },
  { status: 'CANCELLED', label: 'Cancelled', color: '#e11d48' },
];

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

function StatusChart({ events }: { events: Event[] }) {
  const counts = statuses.map(item => ({ ...item, count: events.filter(event => event.status === item.status).length }));
  const segments = counts.filter(item => item.count > 0).reduce<{ parts: string[]; accumulated: number }>((result, item) => {
    const start = result.accumulated / events.length * 100;
    const accumulated = result.accumulated + item.count;
    return { parts: [...result.parts, `${item.color} ${start}% ${accumulated / events.length * 100}%`], accumulated };
  }, { parts: [], accumulated: 0 }).parts;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-status">
      <h2 id="report-status" className="font-bold text-neutral-900">Event status</h2>
      <p className="mt-1 text-sm text-neutral-500">All events by their current status.</p>
      {events.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No events to report yet.</p> : (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
          <div
            aria-hidden="true"
            className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${segments.join(', ')})` }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-bold text-neutral-900">{events.length}</span>
              <span className="text-xs text-neutral-500">events</span>
            </div>
          </div>
          <ul className="w-full space-y-3">
            {counts.map(item => (
              <li key={item.status} className="flex items-center justify-between gap-3 text-sm text-neutral-700">
                <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />{item.label}</span>
                <span className="font-bold">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CategoryChart({ events }: { events: Event[] }) {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
  const categories = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const maximum = Math.max(1, ...categories.map(([, count]) => count));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-categories">
      <h2 id="report-categories" className="font-bold text-neutral-900">Events by category</h2>
      <p className="mt-1 text-sm text-neutral-500">Number of events in each category.</p>
      {categories.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No events to report yet.</p> : (
        <ul className="mt-6 space-y-4">
          {categories.map(([category, count]) => (
            <li key={category}>
              <div className="mb-1 flex justify-between gap-3 text-sm text-neutral-700"><span className="break-words">{category}</span><span className="font-bold">{count}</span></div>
              <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8b20b3] to-[#bb287b]" style={{ width: `${count / maximum * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BookingChart({ registrations }: { registrations: EventRegistration[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { key: monthKey(date), label: date.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }), count: 0 };
  });
  const lookup = new Map(months.map(month => [month.key, month]));
  for (const registration of registrations) {
    if (registration.status === 'CANCELLED') continue;
    const date = new Date(registration.createdAt);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const month = lookup.get(monthKey(date));
    if (month) month.count += 1;
  }
  const maximum = Math.max(1, ...months.map(month => month.count));
  const points = months.map((month, index) => ({ x: 30 + index * 68, y: 170 - month.count / maximum * 135 }));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-bookings">
      <h2 id="report-bookings" className="font-bold text-neutral-900">Booking trend</h2>
      <p className="mt-1 text-sm text-neutral-500">Currently non-cancelled registrations, grouped by booking month over the last six months.</p>
      <svg aria-hidden="true" viewBox="0 0 400 190" className="mt-5 h-44 w-full">
        <line x1="30" y1="170" x2="370" y2="170" stroke="#cbd5e1" />
        <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#d43f22" strokeWidth="4" strokeLinejoin="round" />
        {points.map((point, index) => <circle key={months[index].key} cx={point.x} cy={point.y} r="5" fill="#d43f22" />)}
      </svg>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {months.map(month => <li key={month.key} className="text-xs text-neutral-600"><span className="block">{month.label}</span><span className="mt-1 block font-bold text-neutral-900">{month.count} bookings</span></li>)}
      </ul>
    </section>
  );
}

export default function OrganizerReports() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
  const [error, setError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then(async response => {
        const loadedEvents = response.data.data;
        if (!active) return;
        setEvents(loadedEvents);
        const results = await Promise.allSettled(loadedEvents.map(event => getEventRegistrations(event.id)));
        if (!active) return;
        const failed = results.filter(result => result.status === 'rejected').length;
        if (failed) {
          setBookingError(`Bookings could not be loaded for ${failed} ${failed === 1 ? 'event' : 'events'}. The trend is unavailable until all bookings load.`);
          return;
        }
        setRegistrations(results.flatMap(result => result.status === 'fulfilled' ? result.value.data.data : []));
      })
      .catch(loadError => {
        if (active) setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data?.message ?? 'Reports could not be loaded.'
          : 'Reports could not be loaded.');
      });
    return () => { active = false; };
  }, [attempt]);

  const retry = () => {
    setEvents(null);
    setRegistrations(null);
    setError('');
    setBookingError('');
    setAttempt(value => value + 1);
  };
  const booked = events?.reduce((sum, event) => sum + Math.max(0, event.capacity - event.availableCapacity), 0) ?? 0;
  const capacity = events?.reduce((sum, event) => sum + event.capacity, 0) ?? 0;

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader title="Reports" subtitle="Insights across your events and registrations." showNavigation={false} />
          {error ? (
            <div role="alert" className="rounded-xl bg-rose-50 p-5 text-rose-800">
              <p>{error}</p><Button type="button" className="mt-3" onClick={retry}>Try again</Button>
            </div>
          ) : !events ? (
            <div role="status" className="flex items-center gap-3 py-12 text-neutral-700"><Spinner /> Loading reports…</div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Total events</p><p className="mt-1 text-2xl font-bold text-neutral-900">{events.length}</p></div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Published events</p><p className="mt-1 text-2xl font-bold text-neutral-900">{events.filter(event => event.status === 'PUBLISHED').length}</p></div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Booked places / capacity</p><p className="mt-1 text-2xl font-bold text-neutral-900">{booked} / {capacity}</p><p className="mt-1 text-xs text-neutral-500">Across all events, including cancelled events</p></div>
              </div>
              <div className="grid gap-5 xl:grid-cols-2"><StatusChart events={events} /><CategoryChart events={events} /></div>
              {bookingError ? (
                <div role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-800"><p>{bookingError}</p><Button type="button" className="mt-3" onClick={retry}>Try again</Button></div>
              ) : registrations ? <BookingChart registrations={registrations} /> : (
                <div role="status" className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-neutral-700 shadow-sm"><Spinner /> Loading booking trend…</div>
              )}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
