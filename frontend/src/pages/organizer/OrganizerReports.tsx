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
  { status: 'PUBLISHED', label: 'Published', color: '#a3cc85' },
  { status: 'DRAFT', label: 'Draft', color: '#8faadb' },
  { status: 'COMPLETED', label: 'Completed', color: '#fbe165' },
  { status: 'CANCELLED', label: 'Cancelled', color: '#ffbd00' },
];

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
const getMonthlyBookings = (registrations: EventRegistration[]) => {
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
  return months;
};

const formatPercent = (percent: number) => {
  if (percent > 0 && percent < 0.1) return '<0.1%';
  if (percent > 99.9 && percent < 100) return '>99.9%';
  return `${Number(percent.toFixed(1))}%`;
};

function StatusChart({ events }: { events: Event[] }) {
  const counts = statuses.map(item => {
    const count = events.filter(event => event.status === item.status).length;
    const percent = events.length ? count / events.length * 100 : 0;
    return { ...item, count, percent, angle: percent * 3.6 };
  });
  const slices = counts.filter(item => item.count > 0).reduce<Array<(typeof counts)[number] & { start: number }>>((result, item) => {
    const previous = result[result.length - 1];
    return [...result, { ...item, start: previous ? previous.start + previous.angle : 0 }];
  }, []);
  const segments = slices.map(item => `${item.color} ${item.start}deg ${item.start + item.angle}deg`);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-status">
      <h2 id="report-status" className="font-bold text-neutral-900">Event status</h2>
      <p className="mt-1 text-sm text-neutral-500">All events by their current status. Total: {events.length}.</p>
      {events.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No events to report yet.</p> : (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
          <div aria-hidden="true" className="relative h-[116px] w-48 shrink-0">
            <div
              className="absolute left-0 top-0 h-48 w-48 rounded-full"
              style={{ background: `conic-gradient(${segments.join(', ')})`, transform: 'translateY(20px) scaleY(0.5)', transformOrigin: 'top', filter: 'brightness(0.6)' }}
            />
            <div
              className="absolute left-0 top-0 h-48 w-48 rounded-full"
              style={{ background: `conic-gradient(${segments.join(', ')})`, transform: 'scaleY(0.5)', transformOrigin: 'top' }}
            />
            <svg viewBox="0 0 192 116" className="absolute inset-0 h-full w-full">
              {slices.filter(item => item.angle >= 36).map(item => {
                const radians = (item.start + item.angle / 2) * Math.PI / 180;
                const radius = slices.length === 1 ? 0 : 62;
                return (
                  <text key={item.status} x={96 + radius * Math.sin(radians)} y={48 - radius / 2 * Math.cos(radians)} textAnchor="middle" dominantBaseline="middle" fill="#171717" className="text-xs font-bold">
                    {formatPercent(item.percent)}
                  </text>
                );
              })}
            </svg>
          </div>
          <ul className="w-full space-y-3">
            {counts.map(item => (
              <li key={item.status} className="flex items-center justify-between gap-3 text-sm text-neutral-700">
                <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />{item.label}</span>
                <span className="font-bold">{item.count} <span className="font-normal">({formatPercent(item.percent)})</span></span>
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
  const step = Math.max(1, Math.ceil(maximum / 4));
  const tickCount = Math.ceil(maximum / step);
  const scaleMaximum = tickCount * step;
  const axisWidth = Math.max(40, String(scaleMaximum).length * 9 + 8);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const barColors = ['#80a6d7', '#baa2ee', '#f47d82', '#e6cc54'];

  return (
    <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-categories">
      <h2 id="report-categories" className="font-bold text-neutral-900">Events by category</h2>
      <p className="mt-1 text-sm text-neutral-500">Number of events in each category.</p>
      {categories.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No events to report yet.</p> : (
        <div className="mt-6 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(300, categories.length * 80 + axisWidth)}px` }}>
            <p className="mb-5 text-xs font-semibold text-neutral-700">Number of events</p>
            <div className="flex">
              <div aria-hidden="true" className="relative h-48 shrink-0" style={{ width: axisWidth }}>
                {ticks.map(tick => (
                  <span key={tick} className="absolute right-2 translate-y-1/2 text-xs text-neutral-500" style={{ bottom: `${tick / scaleMaximum * 100}%` }}>
                    {tick}
                  </span>
                ))}
              </div>
              <div className="relative h-48 flex-1 border-b border-l border-neutral-400">
                {ticks.filter(tick => tick > 0).map(tick => (
                  <div key={tick} aria-hidden="true" className="absolute left-0 right-0 border-t border-neutral-200" style={{ bottom: `${tick / scaleMaximum * 100}%` }} />
                ))}
                <ul className="relative flex h-full" aria-label="Events by category">
                  {categories.map(([category, count], index) => (
                    <li key={category} className="relative flex h-full flex-1 items-end justify-center">
                      <span className="sr-only">{category}: {count} {count === 1 ? 'event' : 'events'}</span>
                      <span aria-hidden="true" className="absolute mb-1 text-xs font-semibold text-neutral-700" style={{ bottom: `${count / scaleMaximum * 100}%` }}>{count}</span>
                      <div aria-hidden="true" className="w-12 max-w-[70%]" style={{ height: `${count / scaleMaximum * 100}%`, backgroundColor: barColors[index % barColors.length] }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div aria-hidden="true" className="flex" style={{ marginLeft: axisWidth }}>
              {categories.map(([category]) => (
                <span key={category} className="flex-1 break-words px-1 pt-2 text-center text-xs text-neutral-700">{category}</span>
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-neutral-700" style={{ marginLeft: axisWidth }}>Event category</p>
          </div>
        </div>
      )}
    </section>
  );
}

function BookingChart({ registrations }: { registrations: EventRegistration[] }) {
  const months = getMonthlyBookings(registrations);
  const maximum = Math.max(1, ...months.map(month => month.count));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const tickCount = Math.ceil(maximum / step);
  const scaleMaximum = tickCount * step;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const left = Math.max(55, String(scaleMaximum).length * 7 + 12);
  const right = 570;
  const top = 30;
  const bottom = 170;
  const points = months.map((month, index) => ({
    x: left + index * (right - left) / (months.length - 1),
    y: bottom - month.count / scaleMaximum * (bottom - top),
  }));

  return (
    <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-bookings">
      <h2 id="report-bookings" className="font-bold text-neutral-900">Booking trend</h2>
      <p className="mt-1 text-sm text-neutral-500">Currently non-cancelled registrations, grouped by booking month over the last six months.</p>
      <div className="mt-5 overflow-x-auto">
        <svg aria-hidden="true" viewBox="0 0 600 220" className="block w-full min-w-[600px]">
          <text x={left} y="14" fontSize="11" fill="#64748b">Bookings</text>
          <path d={`M ${left} ${top} V ${bottom} H ${right}`} fill="none" stroke="#a3a3a3" />
          {ticks.map(tick => {
            const y = bottom - tick / scaleMaximum * (bottom - top);
            return (
              <g key={tick}>
                <line x1={left - 4} y1={y} x2={left} y2={y} stroke="#a3a3a3" />
                <text x={left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#64748b">{tick}</text>
              </g>
            );
          })}
          {points.map((point, index) => (
            <g key={months[index].key}>
              <line x1={point.x} y1={bottom} x2={point.x} y2={bottom + 4} stroke="#a3a3a3" />
              <text x={point.x} y={bottom + 18} textAnchor="middle" fontSize="11" fill="#64748b">{months[index].label}</text>
            </g>
          ))}
          <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
          {points.map((point, index) => <circle key={months[index].key} cx={point.x} cy={point.y} r="5.5" fill="#111111" />)}
        </svg>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {months.map(month => <li key={month.key} className="text-xs text-neutral-600"><span className="block">{month.label}</span><span className="mt-1 block font-bold text-neutral-900">{month.count} bookings</span></li>)}
      </ul>
    </section>
  );
}

function BookingScatterChart({ registrations }: { registrations: EventRegistration[] }) {
  const months = getMonthlyBookings(registrations);
  const maximum = Math.max(1, ...months.map(month => month.count));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const tickCount = Math.ceil(maximum / step);
  const scaleMaximum = tickCount * step;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const left = 56;
  const right = 570;
  const top = 24;
  const bottom = 180;
  const points = months.map((month, index) => ({
    ...month,
    x: left + index * (right - left) / (months.length - 1),
    y: bottom - month.count / scaleMaximum * (bottom - top),
  }));
  const average = months.reduce((sum, month) => sum + month.count, 0) / months.length;
  const meanIndex = (months.length - 1) / 2;
  const slope = months.reduce((sum, month, index) => sum + (index - meanIndex) * (month.count - average), 0)
    / months.reduce((sum, _month, index) => sum + (index - meanIndex) ** 2, 0);
  const trend = [0, months.length - 1].map(index => ({
    x: points[index].x,
    y: bottom - Math.max(0, Math.min(scaleMaximum, average + slope * (index - meanIndex))) / scaleMaximum * (bottom - top),
  }));

  return (
    <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="report-booking-volume">
      <h2 id="report-booking-volume" className="font-bold text-neutral-900">Booking volume</h2>
      <p className="mt-1 text-sm text-neutral-500">Monthly booking counts shown as individual points with a trend line.</p>
      <div className="mt-5 overflow-x-auto">
        <svg viewBox="0 0 600 220" className="block w-full min-w-[600px]" role="img" aria-label="Scatter plot of monthly booking volume for the last six months">
          <text x={left} y="14" fontSize="11" fill="#64748b">Bookings</text>
          <path d={`M ${left} ${top} V ${bottom} H ${right}`} fill="none" stroke="#a3a3a3" />
          {ticks.map(tick => {
            const y = bottom - tick / scaleMaximum * (bottom - top);
            return (
              <g key={tick}>
                <line x1={left} y1={y} x2={right} y2={y} stroke="#e5e7eb" />
                <text x={left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#64748b">{tick}</text>
              </g>
            );
          })}
          {points.map(point => (
            <text key={point.key} x={point.x} y={bottom + 18} textAnchor="middle" fontSize="11" fill="#64748b">{point.label}</text>
          ))}
          <line x1={trend[0].x} y1={trend[0].y} x2={trend[1].x} y2={trend[1].y} stroke="#cf7968" strokeWidth="2" />
          {points.map(point => (
            <g key={point.key}>
              <title>{`${point.label}: ${point.count} ${point.count === 1 ? 'booking' : 'bookings'}`}</title>
              <rect x={point.x - 4} y={point.y - 4} width="8" height="8" fill={point.count >= average ? '#b42318' : '#82939d'} stroke="#ffffff" strokeWidth="1" />
            </g>
          ))}
        </svg>
      </div>
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
              ) : registrations ? (
                <div className="space-y-5">
                  <BookingChart registrations={registrations} />
                  <BookingScatterChart registrations={registrations} />
                </div>
              ) : (
                <div role="status" className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-neutral-700 shadow-sm"><Spinner /> Loading booking trend…</div>
              )}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
