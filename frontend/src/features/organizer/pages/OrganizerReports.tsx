import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PageWrapper from '@/layouts/PageWrapper';
import { DashboardHeader } from '@/layouts/DashboardSidebar';
import OrganizerSidebar from '@/layouts/OrganizerSidebar';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { getEventRegistrations, getMyEvents, type EventRegistration } from '@/features/events/services/eventService';
import type { Event, EventStatus } from '@/types/event';

const statuses: Array<{ status: EventStatus; label: string; color: string }> = [
  { status: 'PUBLISHED', label: 'Published', color: '#a3cc85' },
  { status: 'DRAFT', label: 'Draft', color: '#8faadb' },
  { status: 'COMPLETED', label: 'Completed', color: '#fbe165' },
  { status: 'CANCELLED', label: 'Cancelled', color: '#ffbd00' },
];

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

function getMonthlyEventSummary(events: Event[]) {
  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(startYear, 7 + index, 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString('en-ZA', { month: 'short' }),
      fullLabel: date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
      total: 0,
      published: 0,
    };
  });
  const monthLookup = new Map(months.map(month => [month.key, month]));
  for (const event of events) {
    const createdAt = new Date(event.createdAt);
    if (!Number.isFinite(createdAt.getTime()) || createdAt > now) continue;
    const month = monthLookup.get(monthKey(createdAt));
    if (!month) continue;
    month.total += 1;
    if (event.status === 'PUBLISHED') month.published += 1;
  }
  return months;
}

const formatPercent = (percent: number) => {
  if (percent > 0 && percent < 0.1) return '<0.1%';
  if (percent > 99.9 && percent < 100) return '>99.9%';
  return `${Number(percent.toFixed(1))}%`;
};

function EventCalendar({ events }: { events: Event[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const firstDay = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthEvents = events
    .map(event => ({ event, date: new Date(event.startTime) }))
    .filter(({ date }) => Number.isFinite(date.getTime()) && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const counts = new Map<number, number>();
  for (const { date } of monthEvents) counts.set(date.getDate(), (counts.get(date.getDate()) ?? 0) + 1);

  return (
    <section aria-labelledby="report-event-calendar" className="min-w-0 rounded-lg border border-[#6b1834] bg-[#090909] p-3" style={{ backgroundImage: 'radial-gradient(ellipse at 72% 20%, #81132f 0%, #4d0b1c 30%, #090909 70%)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="report-event-calendar" className="text-sm font-bold text-white">Event calendar</h2>
          <p className="mt-1 text-sm text-rose-100">Event start dates, including all statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg border border-[#9f3556] bg-[#6b1834] px-3 py-1 text-white hover:bg-[#842746]">‹</button>
          <span aria-live="polite" className="min-w-32 text-center text-sm font-semibold text-white">{month.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</span>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg border border-[#9f3556] bg-[#6b1834] px-3 py-1 text-white hover:bg-[#842746]">›</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day} className="py-1 font-semibold text-rose-200">{day}</span>)}
        {Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const count = counts.get(day) ?? 0;
          return (
            <div key={day} aria-label={`${day}: ${count} ${count === 1 ? 'event' : 'events'}`} className={`rounded-lg py-1 ${count ? 'bg-yellow-200 font-semibold text-yellow-950' : 'text-neutral-100'}`}>
              {day}{count > 0 && <span aria-hidden="true" className="block text-[10px]">{count} {count === 1 ? 'event' : 'events'}</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 border-t border-[#6b1834] pt-2">
        {monthEvents.length === 0 ? <p className="text-sm text-rose-100">No events start this month.</p> : (
          <ul className="divide-y divide-[#6b1834]">
            {monthEvents.map(({ event, date }) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <Link to={`/organizer/events/${event.id}`} className="font-semibold text-rose-200 hover:underline">{event.title}</Link>
                <span className="text-neutral-300">{date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} · {date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} · {event.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function BookingHeatmapCalendar({
  registrations,
  loading,
  unavailable,
}: {
  registrations: EventRegistration[] | null;
  loading: boolean;
  unavailable: boolean;
}) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 364);
  const start = new Date(cutoff);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const dailyCounts = new Map<string, number>();
  for (const registration of registrations ?? []) {
    if (registration.status === 'CANCELLED') continue;
    const date = new Date(registration.createdAt);
    if (!Number.isFinite(date.getTime()) || date > now || date < cutoff) continue;
    const key = dateKey(date);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }

  const weeks: Date[][] = [];
  for (const weekStart = new Date(start); weekStart <= end; weekStart.setDate(weekStart.getDate() + 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    }));
  }
  const maximum = Math.max(1, ...dailyCounts.values());
  const total = [...dailyCounts.values()].reduce((sum, count) => sum + count, 0);
  const levels = ['bg-neutral-100', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'];

  return (
    <section aria-labelledby="report-booking-heatmap" className="min-w-0 rounded-lg border border-neutral-200 bg-white p-3">
      <h2 id="report-booking-heatmap" className="font-bold text-neutral-900" style={{ fontSize: '0.875rem', lineHeight: 1.25 }}>Booking activity</h2>
      <p className="mt-1 text-sm text-neutral-500">Daily registrations over the past year.</p>
      {loading ? (
        <div role="status" className="mt-5 flex items-center gap-3 text-sm text-neutral-700"><Spinner /> Loading booking activity…</div>
      ) : unavailable ? (
        <p className="mt-5 text-sm text-neutral-500">Booking activity is unavailable.</p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-1" role="img" aria-label={`Daily booking heat map for the past year, ${total} registrations in total.`}>
              <div aria-hidden="true" className="grid shrink-0 grid-rows-[16px_repeat(7,12px)] gap-1 text-[9px] leading-3 text-neutral-500">
                <span />
                {['Sun', '', 'Tue', '', 'Thu', '', 'Sat'].map((day, index) => <span key={index}>{day}</span>)}
              </div>
              {weeks.map((week, index) => {
                const monthStart = week.find(date => date.getDate() === 1);
                return (
                  <div key={dateKey(week[0])} className="flex shrink-0 flex-col gap-1">
                    <span className="h-4 whitespace-nowrap text-[9px] leading-4 text-neutral-500">
                      {monthStart && index > 0 ? monthStart.toLocaleDateString('en-ZA', { month: 'short' }) : ''}
                    </span>
                    {week.map(date => {
                      const count = dailyCounts.get(dateKey(date)) ?? 0;
                      const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / maximum * 4));
                      const label = `${date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}: ${count} ${count === 1 ? 'registration' : 'registrations'}`;
                      return (
                        <span
                          key={dateKey(date)}
                          title={label}
                          className={`h-3 w-3 rounded-[3px] ${levels[level]}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span>{total} registration{total === 1 ? '' : 's'} in the displayed year</span>
            <span className="flex items-center gap-1.5" aria-label="Activity scale from less to more">
              Less
              {levels.map(level => <span key={level} aria-hidden="true" className={`h-3 w-3 rounded-[3px] ${level}`} />)}
              More
            </span>
          </div>
        </>
      )}
    </section>
  );
}

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
    <section className="min-w-0" aria-labelledby="report-status">
      <h2 id="report-status" className="font-bold text-neutral-900" style={{ fontSize: '0.875rem', lineHeight: 1.25 }}>Event status</h2>
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
  const yAxisLabelWidth = 28;
  const leftAxisWidth = axisWidth + yAxisLabelWidth;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const barColors = ['#80a6d7', '#baa2ee', '#f47d82', '#e6cc54'];

  return (
    <section className="min-w-0" aria-labelledby="report-categories">
      <h2 id="report-categories" className="font-bold text-neutral-900" style={{ fontSize: '0.875rem', lineHeight: 1.25 }}>Events by category</h2>
      <p className="mt-1 text-sm text-neutral-500">Number of events in each category.</p>
      {categories.length === 0 ? <p className="mt-6 text-sm text-neutral-500">No events to report yet.</p> : (
        <div className="mt-6 overflow-x-auto">
          <div style={{ minWidth: `${Math.max(300, categories.length * 80 + leftAxisWidth)}px` }}>
            <div className="flex">
              <div aria-hidden="true" className="relative h-48 shrink-0" style={{ width: yAxisLabelWidth }}>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs font-semibold text-neutral-700">
                  Number of events
                </span>
              </div>
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
                      <div aria-hidden="true" className="w-12 max-w-[70%]" style={{ height: `${count / scaleMaximum * 100}%`, backgroundColor: barColors[index % barColors.length] }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div aria-hidden="true" className="flex" style={{ marginLeft: leftAxisWidth }}>
              {categories.map(([category]) => (
                <span key={category} className="flex-1 break-words px-1 pt-2 text-center text-xs text-neutral-700">{category}</span>
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-neutral-700" style={{ marginLeft: leftAxisWidth }}>Event category</p>
          </div>
        </div>
      )}
    </section>
  );
}

function TicketTypeBubbleChart({ events }: { events: Event[] }) {
  const tickets = events.flatMap(event => event.ticketTypes.map(ticket => ({
    id: ticket.id,
    event: event.title,
    name: ticket.name,
    capacity: ticket.quantity,
    booked: ticket.quantity - ticket.availableQuantity,
    price: ticket.price,
  })));
  const types = [...new Set(tickets.map(ticket => ticket.name))].sort((a, b) => a.localeCompare(b));
  const colors = [
    { light: '#b59aff', dark: '#4d17ab' },
    { light: '#7de2c4', dark: '#087351' },
    { light: '#ff9e86', dark: '#a93319' },
    { light: '#ffd67d', dark: '#a96806' },
    { light: '#8acfff', dark: '#1452a0' },
    { light: '#f99fd0', dark: '#a71956' },
  ];
  const capacityStep = Math.max(1, Math.ceil(Math.max(0, ...tickets.map(ticket => ticket.capacity)) / 4));
  const bookedStep = Math.max(1, Math.ceil(Math.max(0, ...tickets.map(ticket => ticket.booked)) / 4));
  const maxPrice = Math.max(0, ...tickets.map(ticket => ticket.price));
  const priceFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

  return (
    <section aria-labelledby="report-ticket-types" className="min-w-0 rounded-lg bg-[#100b25] p-4 text-white">
      <h2 id="report-ticket-types" className="text-sm font-bold">Ticket types</h2>
      <p className="mt-1 text-sm text-slate-300">Capacity and booked tickets for each event and ticket type. Bubble size represents ticket price.</p>
      {tickets.length === 0 ? (
        <p className="mt-6 text-sm text-slate-300">No ticket types to report yet.</p>
      ) : (
        <>
          <ul aria-label="Ticket type colors" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-200">
            {types.map((type, index) => (
              <li key={type} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length].light }} />
                {type}
              </li>
            ))}
          </ul>
          <div className="mt-3 overflow-x-auto">
            <svg viewBox="0 0 960 470" className="block w-full min-w-[560px]" role="img" aria-label="Bubble chart of ticket capacity and booked tickets. Bubble size represents ticket price. Detailed values follow the chart.">
              <defs>
                {colors.map((color, index) => (
                  <radialGradient key={color.dark} id={`ticket-bubble-${index}`} cx="30%" cy="25%" r="80%">
                    <stop offset="0%" stopColor={color.light} />
                    <stop offset="100%" stopColor={color.dark} />
                  </radialGradient>
                ))}
              </defs>
              {Array.from({ length: 5 }, (_, index) => {
                const x = 95 + index * 205;
                const y = 375 - index * 77.5;
                return (
                  <g key={index} stroke="#ffffff" strokeOpacity="0.08" fill="#cbd5e1" fontSize="14">
                    <line x1={x} y1="65" x2={x} y2="375" />
                    <line x1="95" y1={y} x2="915" y2={y} />
                    <text x={x} y="400" textAnchor="middle" stroke="none">{index * capacityStep}</text>
                    <text x="82" y={y + 5} textAnchor="end" stroke="none">{index * bookedStep}</text>
                  </g>
                );
              })}
              <path d="M95 65 V375 H915" fill="none" stroke="#94a3b8" strokeOpacity="0.7" />
              {tickets.map(ticket => {
                const colorIndex = types.indexOf(ticket.name) % colors.length;
                const radius = maxPrice > 0 ? 6 + 30 * Math.sqrt(ticket.price / maxPrice) : 6;
                const x = 95 + (ticket.capacity / (capacityStep * 4)) * 820;
                const y = 375 - (ticket.booked / (bookedStep * 4)) * 310;
                return (
                  <circle key={ticket.id} cx={x} cy={y} r={radius} fill={`url(#ticket-bubble-${colorIndex})`} stroke={colors[colorIndex].light} strokeOpacity="0.7">
                    <title>{`${ticket.event} - ${ticket.name}: ${ticket.booked} booked / ${ticket.capacity} capacity; ${priceFormatter.format(ticket.price)}`}</title>
                  </circle>
                );
              })}
              <text x="505" y="441" textAnchor="middle" fill="#cbd5e1" fontSize="15">Ticket capacity</text>
              <text transform="translate(22 220) rotate(-90)" textAnchor="middle" fill="#cbd5e1" fontSize="15">Booked tickets</text>
            </svg>
          </div>
          <p className="mt-2 text-xs text-slate-300">Booked includes reserved places awaiting payment. All event statuses are included; free tickets use a minimum marker size.</p>
          <details className="mt-3 text-sm text-slate-200">
            <summary className="cursor-pointer font-semibold">View ticket type data</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead><tr className="border-b border-slate-600"><th className="p-2">Event</th><th className="p-2">Ticket type</th><th className="p-2">Capacity</th><th className="p-2">Booked</th><th className="p-2">Price</th></tr></thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-slate-700">
                      <td className="p-2">{ticket.event}</td><td className="p-2">{ticket.name}</td><td className="p-2">{ticket.capacity}</td><td className="p-2">{ticket.booked}</td><td className="p-2">{priceFormatter.format(ticket.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function areaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  const first = points[0];
  const last = points[points.length - 1];
  const curve = points.slice(1).map((point, index) => {
    const previous = points[index];
    const step = (point.x - previous.x) / 3;
    return `C ${previous.x + step} ${previous.y} ${point.x - step} ${point.y} ${point.x} ${point.y}`;
  }).join(' ');
  return `M ${first.x} ${baseline} L ${first.x} ${first.y} ${curve} L ${last.x} ${baseline} Z`;
}

function linePath(points: Array<{ x: number; y: number }>) {
  const first = points[0];
  const curve = points.slice(1).map((point, index) => {
    const previous = points[index];
    const step = (point.x - previous.x) / 3;
    return `C ${previous.x + step} ${previous.y} ${point.x - step} ${point.y} ${point.x} ${point.y}`;
  }).join(' ');
  return `M ${first.x} ${first.y} ${curve}`;
}

function EventTrendsAreaChart({ events }: { events: Event[] }) {
  const months = getMonthlyEventSummary(events);
  const maximum = Math.max(1, ...months.map(month => month.total));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const tickCount = Math.ceil(maximum / step);
  const scaleMaximum = tickCount * step;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const left = 42;
  const right = 550;
  const top = 24;
  const bottom = 190;
  const points = months.map((month, index) => ({
    ...month,
    x: left + index * (right - left) / (months.length - 1),
    totalY: bottom - month.total / scaleMaximum * (bottom - top),
    publishedY: bottom - month.published / scaleMaximum * (bottom - top),
  }));
  const totalPoints = points.map(({ x, totalY }) => ({ x, y: totalY }));
  const publishedPoints = points.map(({ x, publishedY }) => ({ x, y: publishedY }));
  const startLabel = months[0].fullLabel;
  const endLabel = months[months.length - 1].fullLabel;

  return (
    <section className="min-w-0" aria-labelledby="report-event-trends">
      <h2 id="report-event-trends" className="font-bold text-neutral-900" style={{ fontSize: '0.875rem', lineHeight: 1.25 }}>Event trends</h2>
      <p className="mt-1 text-sm text-neutral-500">Total and published events created each month from {startLabel} through {endLabel}.</p>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox="0 0 580 258" className="block w-full min-w-[520px]" role="img" aria-label={`Area chart of total and published events from ${startLabel} through ${endLabel}`}>
          <text x={left} y="14" fontSize="11" fill="#64748b">Events</text>
          {ticks.map(tick => {
            const y = bottom - tick / scaleMaximum * (bottom - top);
            return (
              <g key={tick}>
                <line x1={left} y1={y} x2={right} y2={y} stroke="#e5e7eb" />
                <text x={left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#64748b">{tick}</text>
              </g>
            );
          })}
          <path d={areaPath(totalPoints, bottom)} fill="#f3ad45" fillOpacity="0.76" />
          <path d={areaPath(publishedPoints, bottom)} fill="#72c77a" fillOpacity="0.88" />
          <path d={linePath(totalPoints)} fill="none" stroke="#e7a03a" strokeWidth="2" />
          <path d={linePath(publishedPoints)} fill="none" stroke="#58b968" strokeWidth="2" />
          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#cbd5e1" />
          {points.map(point => (
            <g key={point.key}>
              <title>{`${point.fullLabel}: ${point.total} total events, ${point.published} published`}</title>
              <text x={point.x} y={bottom + 18} textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text>
            </g>
          ))}
          <circle cx="206" cy="236" r="5" fill="#f3ad45" />
          <text x="217" y="240" fontSize="10" fill="#475569">All events</text>
          <circle cx="308" cy="236" r="5" fill="#72c77a" />
          <text x="319" y="240" fontSize="10" fill="#475569">Published</text>
        </svg>
      </div>
    </section>
  );
}

function EventSummaryChart({ events, booked, capacity }: { events: Event[]; booked: number; capacity: number }) {
  const months = getMonthlyEventSummary(events);

  const maximum = Math.max(1, ...months.map(month => month.total));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const tickCount = Math.ceil(maximum / step);
  const scaleMaximum = tickCount * step;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * step);
  const left = 42;
  const right = 430;
  const top = 28;
  const bottom = 178;
  const points = months.map((month, index) => ({
    ...month,
    x: left + index * (right - left) / (months.length - 1),
    totalY: bottom - month.total / scaleMaximum * (bottom - top),
    publishedY: bottom - month.published / scaleMaximum * (bottom - top),
  }));
  const totalEvents = events.length;
  const publishedEvents = events.filter(event => event.status === 'PUBLISHED').length;
  const startLabel = months[0].fullLabel;
  const endLabel = months[months.length - 1].fullLabel;

  return (
    <section aria-labelledby="report-summary" className="min-w-0 xl:col-span-3">
      <h2 id="report-summary" className="font-bold text-neutral-900" style={{ fontSize: '0.875rem', lineHeight: 1.25 }}>Event summary</h2>
      <p className="mt-1 text-xs text-neutral-500">Monthly event totals and published events from {startLabel} through {endLabel}.</p>
      <div className="mt-3 overflow-x-auto">
        <svg viewBox="0 0 460 244" className="block w-full min-w-[400px]" role="img" aria-label={`Scatter plot of total and published events by month from ${startLabel} through ${endLabel}`}>
          <text x={left} y="14" fontSize="10" fill="#64748b">Events</text>
          {ticks.map(tick => {
            const y = bottom - tick / scaleMaximum * (bottom - top);
            return (
              <g key={tick}>
                <line x1={left} y1={y} x2={right} y2={y} stroke="#e5e7eb" />
                <text x={left - 7} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#64748b">{tick}</text>
              </g>
            );
          })}
          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#cbd5e1" />
          {points.map(point => (
            <g key={point.key}>
              <text x={point.x} y={bottom + 17} textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text>
              <circle cx={point.x - 4} cy={point.totalY} r="5" fill="#f3ad45">
                <title>{`${point.label}: ${point.total} total events`}</title>
              </circle>
              <circle cx={point.x + 4} cy={point.publishedY} r="4" fill="#58b968">
                <title>{`${point.label}: ${point.published} published events`}</title>
              </circle>
            </g>
          ))}
          <circle cx="132" cy="226" r="5" fill="#f3ad45" />
          <text x="143" y="230" fontSize="10" fill="#475569">All events</text>
          <circle cx="232" cy="226" r="5" fill="#58b968" />
          <text x="243" y="230" fontSize="10" fill="#475569">Published</text>
        </svg>
      </div>
      <dl className="mt-2 divide-y divide-neutral-200">
        <div className="flex items-center justify-between gap-3 py-2">
          <dt className="text-sm text-neutral-600">Total events</dt>
          <dd className="text-sm font-bold text-neutral-900">{totalEvents}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <dt className="text-sm text-neutral-600">Published events</dt>
          <dd className="text-sm font-bold text-neutral-900">{publishedEvents}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <dt className="text-sm text-neutral-600">Booked places / capacity</dt>
          <dd className="text-sm font-bold text-neutral-900">{booked} / {capacity}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-neutral-500">Booked places across all events, including cancelled events.</p>
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
          setBookingError(`Bookings could not be loaded for ${failed} ${failed === 1 ? 'event' : 'events'}.`);
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
          <DashboardHeader title="Reports" topBarSubtitle="Insights across your events and registrations." showNavigation={false} />
          {error ? (
            <div role="alert" className="rounded-xl bg-rose-50 p-5 text-rose-800">
              <p>{error}</p><Button type="button" className="mt-3" onClick={retry}>Try again</Button>
            </div>
          ) : !events ? (
            <div role="status" className="flex items-center gap-3 py-12 text-neutral-700"><Spinner /> Loading reports…</div>
          ) : (
            <section aria-labelledby="reports-visualization-title" className="rounded-3xl bg-[#f2e5e9] p-3 sm:p-5">
              <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm sm:p-5">
                <h2 id="reports-visualization-title" className="organizer-visualization-header rounded-t-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ color: '#fff', fontSize: '0.875rem', lineHeight: 1.25 }}>
                  Data Visualization
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
                  <div className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-3 xl:col-span-3">
                    <CategoryChart events={events} />
                  </div>
                  <div className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-3 xl:col-span-3">
                    <StatusChart events={events} />
                  </div>
                  <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-3 xl:col-span-3">
                    <EventSummaryChart events={events} booked={booked} capacity={capacity} />
                  </div>
                  <div className="min-w-0 xl:col-span-3">
                    <EventCalendar events={events} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
                  <div className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-3">
                    <EventTrendsAreaChart events={events} />
                  </div>
                  <BookingHeatmapCalendar
                    registrations={registrations}
                    loading={!registrations && !bookingError}
                    unavailable={Boolean(bookingError)}
                  />
                </div>
                <div className="mt-4">
                  <TicketTypeBubbleChart events={events} />
                </div>
                {bookingError && (
                  <div role="alert" className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-rose-800">
                    <p>{bookingError}</p><Button type="button" className="mt-3" onClick={retry}>Try again</Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
