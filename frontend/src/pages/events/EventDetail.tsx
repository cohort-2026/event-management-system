import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { publishedMockEvents } from '@/data/mockEvents';
import { createBooking } from '@/services/bookingService';
import { getEventById } from '@/services/eventService';
import type { Event, EventTicketType } from '@/types/event';

export default function EventDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingNotice, setBookingNotice] = useState('');
  const [now, setNow] = useState<number | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [confirmingRsvp, setConfirmingRsvp] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpComplete, setRsvpComplete] = useState(false);

  useEffect(() => {
    let active = true;
    getEventById(id)
      .then(response => {
        if (active) {
          setEvent(response.data.data);
          setNow(Date.now());
        }
      })
      .catch(loadError => {
        if (active) {
          const sampleEvent = publishedMockEvents.find(sample => sample.id === id);
          if (sampleEvent) {
            setEvent(sampleEvent);
            setNow(Date.now());
          } else {
            setError(axios.isAxiosError(loadError)
              ? (loadError.response?.data?.message ?? 'This event could not be loaded.')
              : 'This event could not be loaded.');
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><Spinner /></div></PageWrapper>;
  if (!event) {
    return (
      <PageWrapper>
        <div role="alert" className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="font-semibold text-neutral-800">{error || 'Event not found.'}</p>
          <Link to="/events" className="mt-4 inline-block text-sm font-semibold text-brand-700">Browse approved events</Link>
        </div>
      </PageWrapper>
    );
  }

  const seatsLeft = Math.max(0, Math.min(event.capacity, event.availableCapacity));
  const fillPercent = event.capacity > 0
    ? Math.min(100, Math.round(((event.capacity - seatsLeft) / event.capacity) * 100))
    : 0;
  const ticketTypes = event.ticketTypes ?? [];
  const bookableTicketTypes = ticketTypes.filter(ticket => !event.isFree || ticket.price === 0);
  const selectedTicket = bookableTicketTypes.find(ticket =>
    ticket.id === selectedTicketId && isTicketOpen(ticket, now),
  ) ??
    bookableTicketTypes.find(ticket => isTicketOpen(ticket, now)) ?? null;
  const bookingUnavailableMessage = getBookingUnavailableMessage(event, bookableTicketTypes, now);
  const paidTicketPrices = ticketTypes.filter(ticket => ticket.price > 0).map(ticket => ticket.price);
  const startingPrice = event.price ?? (paidTicketPrices.length > 0 ? Math.min(...paidTicketPrices) : null);
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const location = event.location?.trim() || event.venue.split(',').at(-1)?.trim();
  const hasSeparateLocation = Boolean(location && location.toLocaleLowerCase() !== event.venue.trim().toLocaleLowerCase());
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  };

  const handleRsvp = async () => {
    if (!selectedTicket || !policyAccepted || submittingRsvp) return;
    setSubmittingRsvp(true);
    setBookingNotice('');
    try {
      const response = await createBooking({
        eventId: event.id,
        eventTicketTypeId: selectedTicket.id,
      });
      const ticketReference = response.data.data.ticket?.referenceNumber;
      setBookingNotice(ticketReference
        ? `Your RSVP is confirmed. Ticket reference: ${ticketReference}`
        : response.data.message);
      setRsvpComplete(true);
      setEvent(current => current ? {
        ...current,
        availableCapacity: Math.max(0, current.availableCapacity - 1),
        ticketTypes: current.ticketTypes.map(ticket => ticket.id === selectedTicket.id
          ? { ...ticket, availableQuantity: Math.max(0, ticket.availableQuantity - 1) }
          : ticket),
      } : current);
      setConfirmingRsvp(false);
      setPolicyAccepted(false);
    } catch (bookingError) {
      setBookingNotice(axios.isAxiosError(bookingError)
        ? bookingError.response?.data?.message ?? 'Your RSVP could not be completed. Please try again.'
        : 'Your RSVP could not be completed. Please try again.');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  return (
    <PageWrapper>
      <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-400">
        <Link to="/events" className="transition-colors hover:text-brand-600">Events</Link>
        <span>/</span>
        <span className="truncate text-neutral-600">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {event.bannerImageUrl || event.imageUrl
              ? <img src={event.bannerImageUrl ?? event.imageUrl} alt={`${event.title} banner`} className="max-h-96 w-full object-cover" />
              : <div className="h-3 bg-brand-600" />}
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{event.category} · {event.eventType.replace('_', ' ')}</span>
                  <h1 className="mt-1 text-2xl font-bold text-neutral-900">{event.title}</h1>
                </div>
                <Badge variant={event.status === 'PUBLISHED' ? 'success' : event.status === 'CANCELLED' ? 'danger' : 'info'}>
                  {event.status === 'PUBLISHED' ? 'PUBLISHED' : event.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon="📅" label="Starts" value={start.toLocaleString('en-ZA', dateTimeOptions)} />
                <InfoRow icon="⌛" label="Ends" value={end.toLocaleString('en-ZA', dateTimeOptions)} />
                {event.venue && <InfoRow icon="📍" label="Venue" value={event.venue} />}
                {hasSeparateLocation && location && <InfoRow icon="🗺️" label="Location" value={location} />}
                {event.meetingDetails && <InfoRow icon="🔗" label="Online meeting" value={event.meetingDetails} />}
                <InfoRow icon="👥" label="Capacity" value={`${Math.max(0, event.availableCapacity)} places remaining of ${event.capacity}`} />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-neutral-500">
                  <span>{event.capacity - seatsLeft} registered</span>
                  <span>{fillPercent}% full</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div className={`h-full rounded-full ${fillPercent > 80 ? 'bg-rose-500' : fillPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fillPercent}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">About this event</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">{event.description}</p>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Ticket options</h2>
            <ul className="mt-4 divide-y divide-neutral-100">
              {ticketTypes.map(ticket => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-neutral-800">{ticket.name}</p>
                    {ticket.description && <p className="mt-1 text-sm text-neutral-500">{ticket.description}</p>}
                    <p className={`mt-1 text-xs ${isTicketOpen(ticket, now) ? 'text-neutral-400' : 'font-medium text-rose-600'}`}>
                      {ticket.bookingDeadline && now !== null && new Date(ticket.bookingDeadline).getTime() <= now
                        ? 'Bookings closed'
                        : ticket.availableQuantity <= 0
                          ? ticket.price === 0 ? 'Fully booked' : 'Sold out'
                          : `${ticket.availableQuantity} available`}
                    </p>
                    {ticket.bookingDeadline && (
                      <p className="mt-1 text-xs text-neutral-400">
                        Sales close {new Date(ticket.bookingDeadline).toLocaleString('en-ZA', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'Africa/Johannesburg',
                        })}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-neutral-900">{ticket.price === 0 ? 'Free' : `R${ticket.price.toFixed(2)}`}</p>
                </li>
              ))}
            </ul>
            {ticketTypes.length === 0 && (
              <p className="mt-4 text-sm text-neutral-500">Ticket options are not available yet.</p>
            )}
            {event.bookingDeadline && (
              <p className="mt-4 text-sm text-neutral-500">
                Registration closes {new Date(event.bookingDeadline).toLocaleString('en-ZA', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Africa/Johannesburg',
                })}
              </p>
            )}
          </section>

          {event.organizer && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-neutral-900">Organizer</h2>
              <p className="font-medium text-neutral-700">
                {[event.organizer.firstname, event.organizer.lastname].filter(Boolean).join(' ')}
              </p>
              {event.organizer.email && <p className="mt-1 text-sm text-neutral-500">{event.organizer.email}</p>}
            </section>
          )}

          {event.rules && event.rules.length > 0 && <EventInformationSection title="Event rules" items={event.rules} />}
          {event.accessibilityInformation && event.accessibilityInformation.length > 0 && (
            <EventInformationSection title="Accessibility" items={event.accessibilityInformation} />
          )}
          {event.attendeeRequirements && event.attendeeRequirements.length > 0 && (
            <EventInformationSection title="Attendee requirements" items={event.attendeeRequirements} />
          )}
        </div>

        <aside>
          <section className="sticky top-20 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {event.isFree ? 'Free' : startingPrice === null ? 'Paid' : `From R${startingPrice.toFixed(2)}`}
              </p>
              <p className="text-sm text-neutral-400">per ticket</p>
            </div>

            {event.cancellationPolicy && (
              <div className="rounded-lg bg-neutral-50 p-4">
                <h2 className="text-sm font-semibold text-neutral-800">Cancellation and refund policy</h2>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{event.cancellationPolicy}</p>
              </div>
            )}

            {user?.role === 'VENDOR' ? (
              <Link to={`/vendor/events/${event.id}/apply`}>
                <Button className="w-full">Apply for a stand</Button>
              </Link>
            ) : rsvpComplete ? (
              <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
                RSVP confirmed
              </p>
            ) : bookingUnavailableMessage ? (
              <div role="status" className="rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 text-center font-medium">
                {bookingUnavailableMessage}
              </div>
            ) : !event.isFree ? (
              <div className="flex flex-col gap-2">
                <Button className="w-full" disabled>
                  {event.eventType === 'ONLINE' ? 'Get Tickets' : 'Book Now'}
                </Button>
                <p className="text-center text-xs text-neutral-500">
                  Paid checkout is not configured yet. No payment or reservation will be taken.
                </p>
              </div>
            ) : user?.role === 'ATTENDEE' ? (
              <>
                {bookableTicketTypes.length > 1 && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                    Ticket type
                    <select
                      value={selectedTicket?.id ?? ''}
                      onChange={change => setSelectedTicketId(change.target.value)}
                      className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {bookableTicketTypes.map(ticket => (
                        <option key={ticket.id} value={ticket.id} disabled={!isTicketOpen(ticket, now)}>
                          {ticket.name} {!isTicketOpen(ticket, now) ? '— unavailable' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Button
                  className="w-full"
                  disabled={!selectedTicket}
                  onClick={() => {
                    setBookingNotice('');
                    setPolicyAccepted(false);
                    setConfirmingRsvp(true);
                  }}
                >
                  RSVP
                </Button>
              </>
            ) : user ? (
              <p role="status" className="text-center text-sm text-neutral-600">
                Sign in with an attendee account to RSVP.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" state={{ from: `/events/${event.id}` }}>
                  <Button className="w-full">
                    Sign in to RSVP
                  </Button>
                </Link>
                <Link to="/register" className="text-center text-sm text-brand-600 hover:text-brand-700">Don't have an account? Register</Link>
              </div>
            )}
            {bookingNotice && (
              <p role="status" className={`text-sm ${bookingNotice.startsWith('Your RSVP is confirmed') ? 'text-emerald-700' : 'text-rose-700'}`}>
                {bookingNotice}
              </p>
            )}
          </section>
        </aside>
      </div>
      {confirmingRsvp && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="rsvp-confirmation-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="rsvp-confirmation-title" className="text-xl font-bold text-neutral-900">Confirm your RSVP</h2>
            <p className="mt-2 text-sm text-neutral-600">
              {selectedTicket.name} · Free · {event.title}
            </p>
            {event.cancellationPolicy && (
              <div className="mt-4 rounded-lg bg-neutral-50 p-4">
                <h3 className="text-sm font-semibold text-neutral-800">Cancellation and refund policy</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{event.cancellationPolicy}</p>
              </div>
            )}
            <label className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={change => setPolicyAccepted(change.target.checked)}
                className="mt-1 accent-brand-600"
              />
              <span>
                {event.cancellationPolicy
                  ? 'I have read and agree to the cancellation and refund policy.'
                  : 'I confirm my free RSVP for this event.'}
              </span>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={submittingRsvp}
                onClick={() => setConfirmingRsvp(false)}
              >
                Cancel
              </Button>
              <Button
                loading={submittingRsvp}
                disabled={!policyAccepted}
                onClick={handleRsvp}
              >
                Confirm RSVP
              </Button>
            </div>
          </section>
        </div>
      )}
    </PageWrapper>
  );
}

function isTicketOpen(ticket: EventTicketType, now: number | null): boolean {
  return ticket.availableQuantity > 0 &&
    (!ticket.bookingDeadline || now === null || new Date(ticket.bookingDeadline).getTime() > now);
}

function getBookingUnavailableMessage(
  event: Event,
  ticketTypes: EventTicketType[],
  now: number | null,
): string | null {
  if (event.status === 'CANCELLED') return 'Event cancelled';
  if (event.status === 'COMPLETED' || (now !== null && new Date(event.endTime).getTime() <= now)) {
    return 'Event has ended';
  }
  if (event.status !== 'PUBLISHED') return 'Registration unavailable';
  if (event.bookingOpen === false) return 'Bookings closed';
  if (event.bookingDeadline && now !== null && new Date(event.bookingDeadline).getTime() <= now) {
    return 'Bookings closed';
  }
  if (event.availableCapacity <= 0 ||
      (ticketTypes.length > 0 && ticketTypes.every(ticket => ticket.availableQuantity <= 0))) {
    return event.isFree ? 'Fully booked' : 'Sold out';
  }
  if (!ticketTypes.some(ticket => isTicketOpen(ticket, now))) return 'Bookings closed';
  return null;
}

function EventInformationSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">{title}</h2>
      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-neutral-600">
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-lg leading-none">{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
        <p className="mt-0.5 whitespace-pre-line text-sm font-medium text-neutral-700">{value}</p>
      </div>
    </div>
  );
}
