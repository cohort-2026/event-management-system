import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import EventArtwork from '@/components/attendee/EventArtwork';
import Spinner from '@/components/legacy/Spinner';
import { useAuth } from '@/context/useAuth';
import { getMyBookings } from '@/services/bookingService';
import { getEvents } from '@/services/eventService';
import { getMyTickets } from '@/services/ticketService';
import type { Booking } from '@/types/booking';
import type { Event } from '@/types/event';
import type { Ticket } from '@/types/ticket';
import { cancelWaitlist, getMyWaitlists } from '@/services/waitlistService';
import type { WaitlistEntry } from '@/types/waitlist';

type DateFilter = 'month' | 'week' | null;
type EventArt = { background: string; sun?: boolean };

const knownCategories = ['Networking', 'Workshop', 'Training'];
const hiddenCategories = ['technology', 'company activity'];

const eventArts: Record<string, EventArt> = {
  technology: { background: 'linear-gradient(115deg, #ed174c 0%, #ff6417 100%)' },
  networking: { background: 'linear-gradient(115deg, #ff8900 0%, #e91e42 100%)' },
  training: { background: 'linear-gradient(115deg, #079b6d 0%, #078f92 100%)' },
  workshop: {
    background: 'repeating-radial-gradient(circle at 25% 60%, rgba(255,255,255,.20) 0 2px, transparent 2px 10px), linear-gradient(115deg, #9226c8 0%, #ed2b91 100%)',
  },
  'company activity': { background: 'linear-gradient(180deg, #22201f 0%, #393533 100%)', sun: true },
  online: {
    background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.11) 0 7px, transparent 7px 17px), linear-gradient(115deg, #1388e9 0%, #6259ec 100%)',
  },
  default: { background: 'linear-gradient(115deg, #d52d54 0%, #fb6b36 100%)' },
};

function getEventDate(event: Event): Date | null {
  for (const value of [event.startTime, event.date]) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function getEventArt(event: Event): EventArt {
  if (event.eventType === 'ONLINE') return eventArts.online;
  return eventArts[event.category.toLowerCase()] ?? eventArts.default;
}

function isOnlineEvent(event: Event): boolean {
  return event.eventType !== 'IN_PERSON';
}

function isInGauteng(venue: string): boolean {
  return /\b(gauteng|johannesburg|joburg|jozi|sandton|pretoria|tshwane|centurion|midrand|rosebank|fourways|soweto|randburg|roodepoort|krugersdorp|kempton park|benoni|boksburg|germiston|alberton|edenvale|springs|brakpan|vereeniging|vanderbijlpark|bryanston|melville|braamfontein|menlyn|hatfield|sunninghill|waterkloof|bedfordview|ekurhuleni|east rand|west rand)\b/i.test(venue);
}

function formatPrice(event: Event): string {
  if (event.isFree) return 'Free';
  const ticketPrices = event.ticketTypes.map(ticket => ticket.price);
  const price = event.price ?? (ticketPrices.length ? Math.min(...ticketPrices) : null);
  return price === null ? 'Price unavailable' : `R${price.toLocaleString('en-ZA')}`;
}

function formatAmount(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

const attendeeButtonHoverClass = 'transition-all duration-150 hover:-translate-y-0.5 hover:bg-[radial-gradient(ellipse_at_70%_15%,#9d174d_0%,#3b0b20_48%,#050505_100%)] hover:text-white hover:shadow-[0_4px_14px_rgba(157,23,77,0.4)] active:translate-y-0';

function filterButtonClass(active: boolean) {
  return `inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 hover:border-[#9d174d] ${attendeeButtonHoverClass} ${
    active
      ? 'border-neutral-950 bg-neutral-950 text-white'
      : 'border-neutral-200 bg-white text-neutral-700'
  }`;
}

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>(null);
  const [gautengOnly, setGautengOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [selectedWaitlist, setSelectedWaitlist] = useState<WaitlistEntry | null>(null);
  const [pendingLeave, setPendingLeave] = useState<WaitlistEntry | null>(null);
  const [leavingWaitlist, setLeavingWaitlist] = useState(false);

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (active) setEvents(response.data.data);
      })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError(loadError)
          ? loadError.response?.data?.message ?? 'Events could not be loaded.'
          : 'Events could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    getMyWaitlists().then(response => setWaitlists(response.data.data)).catch(() => undefined);
  }, []);

  const leaveWaitlist = async () => {
    if (!pendingLeave) return;
    setLeavingWaitlist(true);
    try {
      await cancelWaitlist(pendingLeave.id);
      setWaitlists(current => current.map(item => item.id === pendingLeave.id ? { ...item, status: 'CANCELLED' } : item));
      setPendingLeave(null);
    } catch (error) {
      setBookingsError(axios.isAxiosError(error) ? error.response?.data?.message ?? 'Could not leave this waitlist.' : 'Could not leave this waitlist.');
    } finally { setLeavingWaitlist(false); }
  };

  useEffect(() => {
    let active = true;
    const reportLoadError = (loadError: unknown) => {
      if (!active) return;
      setBookingsError(axios.isAxiosError(loadError)
        ? loadError.response?.data?.message ?? 'Some booking details could not be loaded.'
        : 'Some booking details could not be loaded.');
    };

    Promise.all([
      getMyBookings()
        .then(response => { if (active) setBookings(response.data.data); })
        .catch(reportLoadError),
      getMyTickets()
        .then(response => { if (active) setTickets(response.data.data); })
        .catch(reportLoadError),
    ]).finally(() => {
      if (active) setBookingsLoading(false);
    });

    return () => { active = false; };
  }, []);

  const categories = useMemo(() => {
    const available = new Set(events.map(event => event.category.trim()).filter(Boolean));
    const additional = [...available]
      .filter(value => !knownCategories.some(known => known.toLowerCase() === value.toLowerCase()))
      .filter(value => !hiddenCategories.includes(value.toLowerCase()))
      .sort();
    return ['All', ...knownCategories, ...additional];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const query = search.trim().toLowerCase();

    return events.filter(event => {
      const eventDate = getEventDate(event);
      if (event.status !== 'PUBLISHED' || !eventDate || eventDate < today) return false;
      if (dateFilter === 'month' && (eventDate < monthStart || eventDate >= monthEnd)) return false;
      if (dateFilter === 'week' && (eventDate < weekStart || eventDate >= weekEnd)) return false;
      if (gautengOnly && !isInGauteng(event.venue)) return false;
      if (freeOnly && !event.isFree) return false;
      if (onlineOnly && !isOnlineEvent(event)) return false;
      if (category !== 'All' && event.category.toLowerCase() !== category.toLowerCase()) return false;
      if (!query) return true;

      const searchableText = [
        event.title,
        event.venue,
        event.category,
        event.description,
        event.organizer?.firstname,
        event.organizer?.lastname,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    });
  }, [events, search, category, dateFilter, gautengOnly, freeOnly, onlineOnly]);

  const upcomingBookings = useMemo(() => bookings
    .filter(booking => booking.status !== 'CANCELLED' && new Date(booking.event.startTime) >= new Date())
    .sort((first, second) => new Date(first.event.startTime).getTime() - new Date(second.event.startTime).getTime()), [bookings]);
  const pastBookings = useMemo(() => bookings
    .filter(booking => new Date(booking.event.startTime) < new Date())
    .sort((first, second) => new Date(second.event.startTime).getTime() - new Date(first.event.startTime).getTime()), [bookings]);
  const featuredBooking = upcomingBookings[0];
  const featuredTicket = featuredBooking
    ? tickets.find(ticket => ticket.bookingId === featuredBooking.id && ticket.status === 'ACTIVE')
    : undefined;
  const featuredEvent = featuredBooking
    ? events.find(event => event.id === featuredBooking.eventId)
    : undefined;

  return (
    <AttendeeLayout mainClassName="mx-auto max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 sm:py-7">
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Hi {user?.firstname || 'there'}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            You have {upcomingBookings.length} upcoming event{upcomingBookings.length === 1 ? '' : 's'}.
          </p>
        </div>

        {bookingsError && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {bookingsError}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.85fr]">
          <section aria-label="Next event" className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {bookingsLoading ? (
              <div className="flex min-h-[230px] justify-center py-16"><Spinner /></div>
            ) : featuredBooking ? (
              <div className="grid min-h-[230px] md:grid-cols-[136px_1fr]">
                <EventArtwork
                  title={featuredBooking.event.title}
                  category={featuredEvent?.category}
                  bannerImageUrl={featuredEvent?.bannerImageUrl}
                  className="min-h-[150px] md:min-h-full"
                />
                <div className="flex flex-col justify-center p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                      Up next · {daysUntil(new Date(featuredBooking.event.startTime))} days
                    </p>
                    <StatusBadge status={featuredBooking.status} paymentStatus={featuredBooking.paymentStatus} />
                  </div>
                  <h2 className="mt-2 text-lg font-extrabold">{featuredBooking.event.title}</h2>
                  <p className="mt-1 text-xs text-neutral-600">
                    {new Date(featuredBooking.event.startTime).toLocaleDateString('en-ZA', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    {new Date(featuredBooking.event.startTime).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{featuredBooking.event.venue}</p>
                  {featuredBooking.tickets.length > 1 && (
                    <p className="mt-2 text-xs font-semibold text-neutral-700">
                      This booking includes {featuredBooking.tickets.length} tickets.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {featuredTicket && (
                      <>
                        <Link
                          to={`/attendee/tickets/${featuredTicket.id}`}
                          className={`rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white ${attendeeButtonHoverClass}`}
                        >
                          {featuredBooking.tickets.length > 1 ? 'Open ticket 1' : 'Open ticket'}
                        </Link>
                        {featuredBooking.tickets.length > 1 && (
                          <Link to="/attendee/tickets" className="text-xs font-semibold text-rose-700 hover:text-rose-800">
                            View all {featuredBooking.tickets.length} tickets
                          </Link>
                        )}
                      </>
                    )}
                    {!featuredTicket && featuredBooking.paymentStatus === 'PENDING' && (
                      <Link to="/attendee/bookings" className={`rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white ${attendeeButtonHoverClass}`}>
                        Complete booking
                      </Link>
                    )}
                    <Link to={`/events/${featuredBooking.eventId}`} className="text-xs font-semibold text-neutral-600 hover:text-neutral-950">
                      Event details
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[230px] flex-col items-center justify-center px-6 text-center">
                <p className="font-semibold text-neutral-800">No upcoming bookings yet</p>
                <p className="mt-1 text-sm text-neutral-500">Find an event and your ticket will appear here.</p>
                <a href="#discover-events" className="mt-3 text-sm font-semibold text-rose-700">Discover events</a>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="upcoming-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="upcoming-title" className="text-sm font-bold">Upcoming</h2>
              <Link to="/attendee/bookings" className="text-[10px] font-semibold text-rose-700 hover:text-rose-800">
                All bookings →
              </Link>
            </div>
            {bookingsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : upcomingBookings.length ? (
              <ul className="divide-y divide-neutral-100">
                {upcomingBookings.slice(0, 3).map(booking => (
                  <li key={booking.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <DateTile date={new Date(booking.event.startTime)} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/events/${booking.eventId}`} className="block truncate text-xs font-semibold text-neutral-900 hover:text-rose-700">
                        {booking.event.title}
                      </Link>
                      <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                        {new Date(booking.event.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {booking.totalAmount === 0 ? 'Free' : formatAmount(booking.totalAmount)}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} paymentStatus={booking.paymentStatus} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-xs text-neutral-500">Nothing booked yet.</p>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-bold">Past events</h2>
            {bookingsLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : pastBookings.length ? (
              <ul className="space-y-3">
                {pastBookings.slice(0, 3).map(booking => {
                  const wasCheckedIn = booking.tickets.some(ticket => ticket.status === 'USED');
                  return (
                    <li key={booking.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/events/${booking.eventId}`} className="block truncate text-xs font-semibold hover:text-rose-700">
                          {booking.event.title}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-neutral-500">
                          {new Date(booking.event.startTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          {' · '}
                          {booking.event.venue}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[9px] font-semibold text-violet-700">
                        {wasCheckedIn ? 'Checked in' : booking.status === 'CANCELLED' ? 'Cancelled' : 'Missed'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-5 text-xs text-neutral-500">Your past events will appear here.</p>
            )}
          </section>

          <section aria-labelledby="discover-events" className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="discover-events" className="text-sm font-bold">You might like</h2>
                <p className="mt-0.5 text-[10px] text-neutral-500">Find your next event</p>
              </div>
              <Link to="/events" className="text-[10px] font-semibold text-rose-700 hover:text-rose-800">Browse all events →</Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {events.filter(event => event.status === 'PUBLISHED' && new Date(event.startTime) >= new Date())
                  .slice(0, 2)
                  .map(event => (
                    <Link key={event.id} to={`/events/${event.id}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-100 p-2 hover:border-neutral-300">
                      <EventArtwork title="" category={event.category} bannerImageUrl={event.bannerImageUrl} className="h-14 w-14 shrink-0 rounded-md" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{event.title}</span>
                        <span className="mt-1 block truncate text-[10px] text-neutral-500">
                          {event.isFree ? 'Free' : formatPrice(event)} · {event.eventType === 'ONLINE' ? 'Online' : event.venue}
                        </span>
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section aria-labelledby="my-waitlists" className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div><h2 id="my-waitlists" className="text-sm font-bold">My Waitlists</h2><p className="mt-1 text-[10px] text-neutral-500">Your place in sold out ticket queues</p></div>
          <Link to="/events" className="text-[10px] font-semibold text-rose-700">Browse events</Link>
        </div>
        {waitlists.length === 0 ? <div className="rounded-lg bg-neutral-50 px-4 py-6 text-center"><p className="text-sm text-neutral-600">You haven&apos;t joined any waitlists yet.</p><Link to="/events" className="mt-2 inline-block text-xs font-semibold text-rose-700">Find published events</Link></div> :
          <ul className="divide-y divide-neutral-100">{waitlists.map(entry => <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
            <EventArtwork title={entry.event.title} bannerImageUrl={entry.event.bannerImageUrl} className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-neutral-900">{entry.event.title}</p><p className="mt-1 text-[10px] text-neutral-500">{entry.ticketType.name} · {new Date(entry.event.startTime).toLocaleDateString('en-ZA')} · {entry.event.venue}</p></div>
            <div className="text-right"><p className="text-xs font-bold">{['WAITING', 'OFFERED'].includes(entry.status) ? `#${entry.position}` : entry.status}</p><p className="text-[10px] text-neutral-500">{entry.status.toLowerCase()}</p></div>
            <div className="flex gap-2"><Link to={`/events/${entry.event.id}`} className="rounded-md border px-2 py-1.5 text-[10px] font-semibold">View Event</Link><button type="button" onClick={() => setSelectedWaitlist(entry)} className="rounded-md border px-2 py-1.5 text-[10px] font-semibold">Details</button>{['WAITING', 'OFFERED'].includes(entry.status) && <button type="button" onClick={() => setPendingLeave(entry)} className="rounded-md border px-2 py-1.5 text-[10px] font-semibold text-rose-700">Leave</button>}</div>
          </li>)}</ul>}
      </section>

      {selectedWaitlist && <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedWaitlist(null); }}><section role="dialog" aria-modal="true" aria-labelledby="waitlist-details-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"><div className="bg-gradient-to-r from-rose-700 to-orange-500 px-5 py-4 text-white"><p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Attendee dashboard</p><h2 id="waitlist-details-title" className="mt-1 text-lg font-bold">Waitlist details</h2></div><div className="p-5"><p className="text-sm font-semibold text-neutral-900">{selectedWaitlist.event.title}</p><p className="mt-1 text-xs text-neutral-600">{selectedWaitlist.ticketType.name}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-neutral-50 p-3"><p className="text-[10px] text-neutral-500">Position</p><p className="mt-1 text-sm font-bold">{['WAITING', 'OFFERED'].includes(selectedWaitlist.status) ? `#${selectedWaitlist.position}` : '—'}</p></div><div className="rounded-lg bg-neutral-50 p-3"><p className="text-[10px] text-neutral-500">Status</p><p className="mt-1 text-sm font-bold capitalize">{selectedWaitlist.status.toLowerCase()}</p></div></div><p className="mt-3 text-xs text-neutral-600">Joined {new Date(selectedWaitlist.createdAt).toLocaleDateString('en-ZA')}</p><p className="mt-4 rounded-lg border border-neutral-200 p-3 text-xs leading-relaxed text-neutral-600">If a ticket becomes available, waitlist offers will be handled by the event team. Joining does not guarantee a ticket.</p><button type="button" onClick={() => setSelectedWaitlist(null)} className="mt-5 w-full rounded-lg bg-neutral-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">Close</button></div></section></div>}

      {pendingLeave && <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !leavingWaitlist) setPendingLeave(null); }}><section role="dialog" aria-modal="true" aria-labelledby="leave-waitlist-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"><div className="px-5 pt-5"><span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700" aria-hidden="true">!</span><h2 id="leave-waitlist-title" className="mt-3 text-lg font-bold text-neutral-950">Leave this waitlist?</h2><p className="mt-2 text-sm text-neutral-600">You will leave the <span className="font-semibold text-neutral-900">{pendingLeave.ticketType.name}</span> waitlist for <span className="font-semibold text-neutral-900">{pendingLeave.event.title}</span>. You can join again later if registration remains open.</p><p className="mt-3 text-xs text-neutral-500">Your current place will be released.</p></div><div className="mt-5 flex flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end"><button type="button" disabled={leavingWaitlist} onClick={() => setPendingLeave(null)} className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Keep my place</button><button type="button" disabled={leavingWaitlist} onClick={() => void leaveWaitlist()} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60">{leavingWaitlist ? 'Leaving…' : 'Leave waitlist'}</button></div></section></div>}

      <section id="event-search" className="rounded-xl border border-neutral-200 bg-white px-4 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Discover events</h2>
            <p className="mt-1 text-xs text-neutral-500">Search and filter upcoming events around you.</p>
          </div>
          <p className="text-xs text-neutral-500" aria-live="polite">
            {filteredEvents.length} upcoming event{filteredEvents.length === 1 ? '' : 's'}
          </p>
        </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 sm:max-w-[350px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search events, venues, organisers"
                aria-label="Search events, venues, and organisers"
                className="h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </label>

            <button type="button" aria-pressed={gautengOnly} onClick={() => setGautengOnly(value => !value)} className={filterButtonClass(gautengOnly)}>
              <PinIcon className="h-3.5 w-3.5" /> Gauteng
            </button>
            <button type="button" aria-pressed={dateFilter === 'month'} onClick={() => setDateFilter(value => value === 'month' ? null : 'month')} className={filterButtonClass(dateFilter === 'month')}>
              This month
            </button>
            <button type="button" aria-pressed={dateFilter === 'week'} onClick={() => setDateFilter(value => value === 'week' ? null : 'week')} className={filterButtonClass(dateFilter === 'week')}>
              This week
            </button>
            <button type="button" aria-pressed={freeOnly} onClick={() => setFreeOnly(value => !value)} className={filterButtonClass(freeOnly)}>
              Free
            </button>
            <button type="button" aria-pressed={onlineOnly} onClick={() => setOnlineOnly(value => !value)} className={filterButtonClass(onlineOnly)}>
              Online
            </button>
          </div>

          <div className="mb-5 mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="Filter by event category">
              {categories.map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={`rounded-full text-xs ${attendeeButtonHoverClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                    category === value
                      ? 'bg-rose-50 px-2.5 py-1 font-semibold text-rose-700'
                      : 'py-1 text-neutral-600'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : filteredEvents.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredEvents.map(event => (
                <EventTile key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center">
              <p className="text-sm font-semibold text-neutral-700">No upcoming events found</p>
              <p className="mt-1 text-xs text-neutral-500">Try changing your search or filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                  setDateFilter(null);
                  setGautengOnly(false);
                  setFreeOnly(false);
                  setOnlineOnly(false);
                }}
                className="mt-3 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Clear filters
              </button>
            </div>
          )}
      </section>
    </AttendeeLayout>
  );
}

function EventTile({ event }: { event: Event }) {
  const eventDate = getEventDate(event);
  const art = getEventArt(event);
  const onlineLabel = event.eventType === 'ONLINE' ? ' · Online' : '';
  const availablePlaces = Math.max(0, event.availableCapacity);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
    >
      <div className="relative h-24 overflow-hidden" style={{ background: art.background }}>
        {event.bannerImageUrl ? (
          <>
            <img src={event.bannerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </>
        ) : art.sun ? (
          <>
            <div className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-orange-500" />
            <div className="absolute -bottom-20 left-[30%] h-32 w-32 rounded-full bg-amber-400" />
          </>
        ) : (
          <>
            <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-white/35" />
            <div className="absolute left-[38%] top-12 h-32 w-32 rounded-full bg-black/20" />
            <div className="absolute -right-4 -top-8 h-24 w-24 rounded-full bg-white/30" />
          </>
        )}

        <div className="absolute left-2.5 top-2.5 flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-white text-center shadow-sm">
          <span className="text-[8px] font-bold leading-tight text-rose-600">
            {eventDate?.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() ?? 'TBA'}
          </span>
          <span className="text-sm font-extrabold leading-tight text-neutral-950">
            {eventDate?.toLocaleDateString('en-US', { day: '2-digit' }) ?? '--'}
          </span>
        </div>
        <span className="absolute right-2.5 top-2.5 max-w-[65%] truncate rounded-full bg-black/20 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur-sm">
          {event.category}{onlineLabel}
        </span>
      </div>

      <div className="p-3">
        <h2 className="truncate text-sm font-bold text-neutral-900 transition-colors group-hover:text-rose-700">
          {event.title}
        </h2>
        <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-neutral-500">
          <PinIcon className="h-3 w-3 shrink-0" />
          {event.venue}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
          <span className="font-semibold text-neutral-800">{formatPrice(event)}</span>
          {availablePlaces > 0 ? (
            <span className="shrink-0 text-neutral-500">{availablePlaces} places left</span>
          ) : (
            <span className="shrink-0 font-semibold text-rose-600">Sold out</span>
          )}
        </div>
      </div>
      <span className="sr-only">View event details</span>
    </Link>
  );
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function DateTile({ date }: { date: Date }) {
  return (
    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-neutral-200 bg-white">
      <span className="text-[8px] font-bold uppercase text-rose-600">{date.toLocaleDateString('en-ZA', { month: 'short' })}</span>
      <span className="text-sm font-extrabold leading-tight">{date.toLocaleDateString('en-ZA', { day: '2-digit' })}</span>
    </span>
  );
}

function StatusBadge({ status, paymentStatus }: Pick<Booking, 'status' | 'paymentStatus'>) {
  const label = status === 'CANCELLED'
    ? 'Cancelled'
    : paymentStatus === 'PENDING'
      ? 'Payment pending'
      : status === 'CONFIRMED'
        ? 'Confirmed'
        : 'Pending';
  const style = status === 'CANCELLED'
    ? 'bg-neutral-100 text-neutral-600'
    : paymentStatus === 'PENDING'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700';
  return <span className={`shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-[9px] font-semibold ${style}`}>{label}</span>;
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="11" cy="11" r="7" strokeWidth="2" />
      <path d="m16 16 4 4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" strokeWidth="1.8" />
    </svg>
  );
}
