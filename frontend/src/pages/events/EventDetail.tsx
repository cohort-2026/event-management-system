import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import EventArtwork from '@/components/attendee/EventArtwork';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';
import NotificationBell from '@/components/layout/NotificationBell';
import { useAuth } from '@/context/useAuth';
import { getEventById } from '@/services/eventService';
import { createBooking, getMyBookings } from '@/services/bookingService';
import { downloadEventCalendar } from '@/utils/downloadEventCalendar';
import type { Booking } from '@/types/booking';
import type { Event } from '@/types/event';
import { getMyWaitlists, joinWaitlist } from '@/services/waitlistService';
import type { WaitlistEntry } from '@/types/waitlist';

interface BookingConfirmation {
  reference: string;
  amount: number;
  paymentStatus: string;
  tickets: Array<{ id: string; referenceNumber: string; type?: string }>;
}

export default function EventDetail() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const vendorBrowse = user?.role === 'VENDOR' || searchParams.get('vendor') === 'true';
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [myWaitlists, setMyWaitlists] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [showJoinWaitlistDialog, setShowJoinWaitlistDialog] = useState(false);

  useEffect(() => {
    let active = true;
    getEventById(id)
      .then(response => {
        if (active) setEvent(response.data.data);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'This event could not be loaded.')
            : 'This event could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!event || user?.role !== 'ATTENDEE') return;

    let active = true;
    getMyBookings()
      .then(response => {
        if (!active) return;
        const booking = response.data.data.find(item =>
          item.eventId === event.id && item.status !== 'CANCELLED');
        setExistingBooking(booking ?? null);
      })
      .catch(lookupError => {
        if (active) setBookingError(getErrorMessage(lookupError, 'Your existing booking could not be checked.'));
      });
    getMyWaitlists().then(response => {
      if (active) setMyWaitlists(response.data.data);
    }).catch(() => undefined);

    return () => { active = false; };
  }, [event, user?.role]);

  if (user?.role === 'VENDOR') {
    if (loading) {
      return <VendorEventLayout><div className="flex justify-center py-16"><Spinner /></div></VendorEventLayout>;
    }
    if (!event) {
      return (
        <VendorEventLayout>
          <div role="alert" className="rounded-lg border border-[#e5e5e5] bg-white p-5 text-center">
            <p className="text-[9px] font-semibold text-[#333]">{error || 'Event not found.'}</p>
            <p className="mt-1 text-[8px] text-[#777]">Vendor applications are unavailable for this event.</p>
            <Link to="/vendor/events" className="vendor-button mt-3 inline-flex rounded-md bg-[#111] px-2.5 py-1.5 text-[8px] font-bold text-white">Back to find events</Link>
          </div>
        </VendorEventLayout>
      );
    }

    const fillPercent = event.capacity > 0
      ? Math.round(((event.capacity - event.availableCapacity) / event.capacity) * 100)
      : 0;
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const now = new Date();
    const registrationOpensAt = new Date(event.registrationOpensAt ?? event.createdAt);
    const registrationClosesAt = new Date(event.registrationClosesAt ?? event.startTime);
    const applicationsOpen = event.status === 'PUBLISHED' && start > now && registrationOpensAt <= now && registrationClosesAt > now;
    const vendorApproved = user.vendorProfileStatus === 'APPROVED';
    const vendorApprovalMessage = user.vendorProfileStatus === 'PENDING_REVIEW'
      ? 'Your business profile is awaiting administrator approval.'
      : user.vendorProfileStatus === 'REJECTED'
        ? 'Update and resubmit your business profile to apply.'
        : 'Submit your business profile for administrator approval to apply.';

    return (
      <VendorEventLayout eventTitle={event.title}>
        <VendorEventContent
          event={event}
          start={start}
          end={end}
          fillPercent={fillPercent}
          applicationsOpen={applicationsOpen}
          vendorApproved={vendorApproved}
          vendorApprovalMessage={vendorApprovalMessage}
        />
      </VendorEventLayout>
    );
  }

  if (loading) return <AttendeeLayout><div className="flex justify-center py-20"><Spinner /></div></AttendeeLayout>;
  if (!event) {
    return (
      <AttendeeLayout>
        <div role="alert" className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="font-semibold text-neutral-800">{error || 'Event not found.'}</p>
          {vendorBrowse && <p className="mt-2 text-sm text-neutral-500">Vendor applications are unavailable for this event.</p>}
          <Link to="/events" className="mt-4 inline-block text-sm font-semibold text-brand-700">Browse approved events</Link>
        </div>
      </AttendeeLayout>
    );
  }

  const fillPercent = event.capacity > 0
    ? Math.round(((event.capacity - event.availableCapacity) / event.capacity) * 100)
    : 0;
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const now = new Date();
  const registrationOpensAt = new Date(event.registrationOpensAt ?? event.createdAt);
  const registrationClosesAt = new Date(event.registrationClosesAt ?? event.startTime);
  const applicationsOpen = event.status === 'PUBLISHED' && start > now && registrationOpensAt <= now && registrationClosesAt > now;
  const selectedTicket = event.ticketTypes.find(ticket => ticket.id === selectedTicketId) ?? event.ticketTypes[0];
  const activeTicketId = selectedTicket?.id ?? '';
  const maxQuantity = Math.max(0, Math.min(
    event.availableCapacity,
    selectedTicket?.availableQuantity ?? 0,
    100,
  ));
  const bookingQuantity = Math.min(Math.max(1, quantity), maxQuantity || 1);
  const canRegister = applicationsOpen && maxQuantity > 0;
  const selectedTicketSoldOut = Boolean(selectedTicket && (selectedTicket.availableQuantity <= 0 || event.availableCapacity <= 0));
  const eventSoldOut = event.availableCapacity <= 0;
  const eventBooking = existingBooking?.eventId === event.id ? existingBooking : null;

  const reserveTickets = (ticketCount: number, ticketId: string) => {
    setEvent(current => current ? {
      ...current,
      availableCapacity: Math.max(0, current.availableCapacity - ticketCount),
      ticketTypes: current.ticketTypes.map(ticket => ticket.id === ticketId
        ? { ...ticket, availableQuantity: Math.max(0, ticket.availableQuantity - ticketCount) }
        : ticket),
    } : current);
  };

  const handleRegister = async () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (user.role !== 'ATTENDEE' || !selectedTicket || !canRegister) return;

    setBookingError('');
    setBookingLoading(true);
    try {
      const response = await createBooking({
        eventId: event.id,
        ticketTypeId: selectedTicket.id,
        quantity: bookingQuantity,
      });
      const booking = response.data.data;
      if (booking.paymentStatus === 'NOT_REQUIRED') {
        reserveTickets(booking.quantity, selectedTicket.id);
        setConfirmation({
          reference: booking.reference,
          amount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
          tickets: booking.tickets.map(ticket => ({
            id: ticket.id,
            referenceNumber: ticket.referenceNumber,
            type: ticket.type,
          })),
        });
      } else {
        navigate(`/attendee/payment/simulate?bookingId=${encodeURIComponent(booking.id)}`);
      }
    } catch (bookingRequestError) {
      setBookingError(getErrorMessage(bookingRequestError, 'Your booking could not be created.'));
    } finally {
      setBookingLoading(false);
    }
  };

  const joinSelectedWaitlist = () => {
    if (!user) { navigate('/login', { state: { from: location } }); return; }
    if (user.role !== 'ATTENDEE' || !selectedTicket || !applicationsOpen) return;
    setBookingError('');
    setShowJoinWaitlistDialog(true);
  };

  const confirmJoinWaitlist = async () => {
    if (!selectedTicket) return;
    setWaitlistLoading(true);
    setBookingError('');
    try {
      const response = await joinWaitlist(event.id, selectedTicket.id);
      setMyWaitlists(current => [response.data.data, ...current]);
      setWaitlistMessage(`You have successfully joined the ${selectedTicket.name} waitlist. Your current position is #${response.data.data.position}.`);
      setShowJoinWaitlistDialog(false);
    } catch (requestError) {
      setBookingError(getErrorMessage(requestError, 'You could not join this waitlist.'));
    } finally { setWaitlistLoading(false); }
  };

  return (
    <AttendeeLayout mainClassName="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid items-start gap-5 lg:grid-cols-[242px_minmax(250px,1fr)_238px]">
        <aside className="space-y-4">
          <EventArtwork
            title={event.title}
            category={event.category}
            bannerImageUrl={event.bannerImageUrl}
            className="aspect-square rounded-2xl shadow-sm"
          />
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-[10px] text-neutral-500">Hosted by</p>
            <p className="mt-1 text-sm font-bold text-neutral-950">
              {event.organizer ? `${event.organizer.firstname} ${event.organizer.lastname}` : 'Event organizer'}
            </p>
            {event.organizer?.email && (
              <a href={`mailto:${event.organizer.email}`} className="mt-3 inline-flex w-full justify-center rounded-md border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                Contact organizer
              </a>
            )}
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold text-neutral-900">Availability</p>
            <p className="mt-1 text-xs text-neutral-600">
              {event.availableCapacity} of {event.capacity} places left
            </p>
          </section>
        </aside>

        <section className="space-y-5">
          <div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-700">
              {event.category} · {event.eventType === 'IN_PERSON' ? 'In person' : event.eventType === 'HYBRID' ? 'Hybrid' : 'Online'}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-neutral-950 sm:text-4xl">{event.title}</h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <DateTile date={start} />
              <div>
                <p className="text-xs font-semibold text-neutral-950">
                  {start.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="mt-0.5 text-[10px] text-neutral-500">
                  {start.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {end.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700" aria-hidden="true">⌖</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-950">{event.venue || 'Online event'}</p>
                {event.venue && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-rose-700 hover:text-rose-800"
                  >
                    View map
                  </a>
                )}
              </div>
            </div>
          </div>

          {event.meetingDetails && (
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-[10px] font-semibold text-neutral-700">Online meeting details</p>
              <p className="mt-1 break-words text-xs text-neutral-600">{event.meetingDetails}</p>
            </div>
          )}

          <section>
            <h2 className="text-sm font-bold text-neutral-950">About</h2>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-600">{event.description}</p>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-bold text-neutral-950">Registration window</h2>
            <p className={`mt-1 text-xs font-semibold ${applicationsOpen ? 'text-emerald-700' : 'text-neutral-600'}`}>
              {applicationsOpen ? 'Registration is open' : now < registrationOpensAt ? 'Registration has not opened yet' : 'Registration is closed'}
            </p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><dt className="text-neutral-500">Opens</dt><dd className="mt-0.5 font-medium text-neutral-800">{registrationOpensAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
              <div><dt className="text-neutral-500">Closes</dt><dd className="mt-0.5 font-medium text-neutral-800">{registrationClosesAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-1 flex justify-between text-[10px] text-neutral-500">
              <span>{event.capacity - event.availableCapacity} registered</span>
              <span>{fillPercent}% full</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className={`h-full rounded-full ${fillPercent > 80 ? 'bg-rose-500' : fillPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fillPercent}%` }} />
            </div>
          </section>

          {vendorBrowse && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Vendor participation</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Application status</dt><dd className={`mt-1 text-sm font-semibold ${applicationsOpen ? 'text-emerald-700' : 'text-neutral-600'}`}>{applicationsOpen ? 'Open' : 'Closed'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Available vendor spaces</dt><dd className="mt-1 text-sm text-neutral-700">{event.availableVendorStands} of {event.vendorStandsAvailable} stand{event.vendorStandsAvailable === 1 ? '' : 's'} available</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Participation requirements</dt><dd className="mt-1 text-sm text-neutral-700">Not specified by the organizer</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Applications open</dt><dd className="mt-1 text-sm text-neutral-700">{new Date(event.registrationOpensAt ?? event.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Applications close</dt><dd className="mt-1 text-sm text-neutral-700">{new Date(event.registrationClosesAt ?? event.startTime).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
              </dl>
            </section>
          )}

          {!vendorBrowse && <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Ticket options</h2>
            <ul className="mt-4 divide-y divide-neutral-100">
              {event.ticketTypes.map(ticket => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-neutral-800">{ticket.name}</p>
                    {ticket.description && <p className="mt-1 text-sm text-neutral-500">{ticket.description}</p>}
                    <p className={`mt-1 text-xs ${ticket.availableQuantity <= 0 || eventSoldOut ? 'font-semibold text-rose-700' : 'text-neutral-400'}`}>
                      {ticket.availableQuantity <= 0 || eventSoldOut ? 'Sold out' : `${ticket.availableQuantity} available`}
                    </p>
                  </div>
                  <p className="font-bold text-neutral-900">{ticket.price === 0 ? 'Free' : `R${ticket.price.toFixed(2)}`}</p>
                </li>
              ))}
            </ul>
          </section>}
        </section>

        <aside>
          <section className="sticky top-20 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            {!vendorBrowse && <div>
              <p className="text-2xl font-bold text-neutral-900">
                {event.isFree ? 'Free' : `From R${Math.min(...event.ticketTypes.filter(ticket => ticket.price > 0).map(ticket => ticket.price)).toFixed(2)}`}
              </p>
              <p className="text-sm text-neutral-400">per ticket</p>
            </div>}

            {vendorBrowse ? (
              applicationsOpen ? (
                event.availableVendorStands <= 0 ? (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-700">All vendor stands have been allocated.</div>
                ) : !user ? (
                  <Link to={`/vendor/events/${event.id}/apply`}><Button className="w-full">Apply for a stand</Button></Link>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">A vendor account is required to apply for a stand.</div>
                )
              ) : (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-700">Vendor applications are closed.</div>
              )
            ) : user?.role === 'ATTENDEE' && eventBooking ? (
              <div>
                <p className="text-sm font-bold text-emerald-800">You&apos;re going!</p>
                <p className="mt-1 text-xs text-neutral-700">
                  {eventBooking.eventTicketType?.name ?? eventBooking.ticketType}
                  {' · '}
                  {new Date(eventBooking.event.startTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </p>
                <p className="mt-2 text-[10px] text-neutral-500">
                  Booking reference <span className="font-mono font-semibold text-neutral-800">{eventBooking.reference}</span>
                </p>
                {bookingError && <p role="alert" className="mt-2 text-xs text-rose-700">{bookingError}</p>}
                {eventBooking.tickets.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {eventBooking.tickets.map(ticket => (
                      <Link key={ticket.id} to={`/attendee/tickets/${ticket.id}`} className="block rounded-lg bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-2.5 text-center text-xs font-bold text-white transition hover:from-rose-700 hover:to-orange-600">
                        View Ticket
                      </Link>
                    ))}
                    {eventBooking.tickets.length > 1 && (
                      <Link to="/attendee/tickets" className="block text-center text-[10px] font-semibold text-rose-700 hover:text-rose-800">
                        View all {eventBooking.tickets.length} tickets
                      </Link>
                    )}
                  </div>
                ) : eventBooking.paymentStatus === 'PENDING' ? (
                  <Link to="/attendee/bookings" className="mt-4 block rounded-md bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-2.5 text-center text-xs font-bold text-white">
                    Complete payment
                  </Link>
                ) : null}
                <Link to="/attendee/bookings" className="mt-3 block text-center text-[10px] font-semibold text-neutral-600 hover:text-neutral-950">
                  Manage or cancel booking
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mb-3 text-sm font-bold text-neutral-950">Choose your ticket</h2>
                <ul className="space-y-1.5">
                  {event.ticketTypes.map(ticket => (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        aria-pressed={activeTicketId === ticket.id}
                        disabled={false}
                        onClick={() => { setSelectedTicketId(ticket.id); setQuantity(1); }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          activeTicketId === ticket.id
                            ? 'border-rose-600 bg-rose-50'
                            : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <span className="flex min-w-0 items-start gap-2">
                          <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${activeTicketId === ticket.id ? 'border-rose-600' : 'border-neutral-300'}`}>
                            {activeTicketId === ticket.id && <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-neutral-900">{ticket.name}</span>
                            <span className="mt-0.5 block text-[9px] text-neutral-500">
                              {ticket.availableQuantity > 0 && event.availableCapacity > 0 ? `${ticket.availableQuantity} left` : 'Sold out'}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-neutral-900">
                          {ticket.price === 0 ? 'Free' : formatPrice(ticket.price)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                    {user?.role === 'ATTENDEE' && selectedTicket && canRegister && (
                  <div className="mt-3 space-y-3">
                    <label className="block text-xs font-medium text-neutral-700">
                      Quantity
                      <input
                        type="number"
                        min={1}
                        max={maxQuantity}
                        value={bookingQuantity}
                        onChange={change => {
                          const next = Number(change.target.value);
                          setQuantity(Number.isFinite(next) ? Math.min(maxQuantity, Math.max(1, Math.floor(next))) : 1);
                        }}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      />
                    </label>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Total</span>
                      <span className="font-bold text-neutral-950">
                        {formatPrice(selectedTicket.price * bookingQuantity)}
                      </span>
                    </div>
                  </div>
                )}

                <>
                    {!canRegister && (
                      <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-600">
                        {event.availableCapacity <= 0 || maxQuantity <= 0
                          ? 'Sold out'
                          : now < registrationOpensAt
                            ? `Registration opens ${registrationOpensAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}.`
                            : now >= registrationClosesAt
                              ? `Registration closed ${registrationClosesAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}.`
                              : 'Registration is closed.'}
                      </p>
                    )}
                    {bookingError && <p role="alert" className="mt-3 text-xs text-rose-700">{bookingError}</p>}
                    {selectedTicket && applicationsOpen && selectedTicket.availableQuantity <= 0 ? (
                      user?.role === 'ATTENDEE' ? (
                        myWaitlists.some(entry => entry.ticketTypeId === selectedTicket.id && ['WAITING', 'OFFERED'].includes(entry.status)) ? (
                          <Link to="/attendee" className="mt-3 block w-full rounded-md border border-rose-200 px-3 py-2.5 text-center text-xs font-bold text-rose-700">View Waitlist Status</Link>
                        ) : <Button className="mt-3 w-full" loading={waitlistLoading} onClick={joinSelectedWaitlist}>Join Waitlist</Button>
                      ) : user ? <p className="mt-3 text-center text-xs text-neutral-600">Waitlists are available to attendees.</p> : <Button className="mt-3 w-full" onClick={joinSelectedWaitlist}>Join Waitlist</Button>
                    ) : user?.role === 'ATTENDEE' ? (
                      <Button
                        className="mt-3 w-full bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600"
                        loading={bookingLoading}
                        disabled={!canRegister || !selectedTicket || bookingQuantity > maxQuantity}
                        onClick={handleRegister}
                      >
                        Book my place
                      </Button>
                    ) : user ? (
                      <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-600">
                        Booking requires an attendee account.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedTicketSoldOut && event.status === 'PUBLISHED' && start > new Date() ? (
                          <Button className="w-full" onClick={() => navigate('/login', { state: { from: location } })}>
                            Join Waitlist
                          </Button>
                        ) : (
                        <Button className="w-full bg-gradient-to-r from-rose-600 to-orange-500" disabled={!canRegister} onClick={handleRegister}>
                          Book my place
                        </Button>
                        )}
                        <Link to="/register" state={{ from: location }} className="block text-center text-[10px] text-neutral-500 hover:text-neutral-800">
                          Create an attendee account
                        </Link>
                      </div>
                    )}
                    {waitlistMessage && <p role="status" className="mt-2 text-xs text-emerald-700">{waitlistMessage}</p>}
                  </>
                <p className="mt-2 text-center text-[9px] text-neutral-500">Free cancellation until the event starts</p>
              </>
            )}
          </section>
        </aside>
      </div>

      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onMouseDown={event => { if (event.target === event.currentTarget) setConfirmation(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="booking-confirmed-title" className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="relative h-16 bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400">
              <div className="absolute -left-5 -top-8 h-24 w-24 rounded-full bg-white/25" />
              <div className="absolute -right-4 -top-8 h-24 w-24 rounded-full bg-black/15" />
            </div>
            <span className="absolute left-1/2 top-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-xl font-bold text-white" aria-hidden="true">✓</span>
            <button type="button" onClick={() => setConfirmation(null)} aria-label="Close booking confirmation" className="absolute right-3 top-3 rounded-full bg-black/10 px-2 py-1 text-sm text-white hover:bg-black/20">×</button>
            <div className="px-5 pb-5 pt-8 text-center sm:px-6">
              <h2 id="booking-confirmed-title" className="text-lg font-extrabold text-neutral-950">
                You&apos;re going, {user?.firstname || 'attendee'}!
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                {`${confirmation.tickets.length} ${confirmation.tickets.length === 1 ? 'ticket is' : 'tickets are'} ready${user?.email ? ` for ${user.email}` : ''}.`}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-left">
                <div>
                  <p className="text-[9px] text-neutral-500">Ticket</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-neutral-900">{selectedTicket?.name ?? confirmation.tickets[0]?.type ?? 'Ticket'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-neutral-500">Quantity</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-neutral-900">{confirmation.tickets.length}</p>
                </div>
                <div>
                  <p className="text-[9px] text-neutral-500">When</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-neutral-900">
                    {start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {start.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-neutral-500">Booking {confirmation.reference} · {formatPrice(confirmation.amount)}</p>
              {confirmation.tickets.length > 0 && (
                <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto text-left">
                  {confirmation.tickets.map((ticket, index) => (
                    <li key={ticket.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold text-neutral-500">Ticket {index + 1} · {selectedTicket?.name ?? ticket.type ?? 'Ticket'}</p>
                        <p className="truncate font-mono text-[10px] font-bold text-neutral-900">{ticket.referenceNumber}</p>
                      </div>
                      <Link to={`/attendee/tickets/${ticket.id}`} className="shrink-0 text-[10px] font-semibold text-rose-700 hover:text-rose-800">View ticket</Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/attendee/tickets" className="rounded-lg bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-2.5 text-xs font-bold text-white">
                  View all tickets
                </Link>
                <button
                  type="button"
                  onClick={() => downloadEventCalendar({
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    startTime: start,
                    endTime: end,
                    venue: event.venue,
                    meetingDetails: event.meetingDetails,
                  })}
                  className="rounded-lg border border-neutral-300 px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Add to calendar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {showJoinWaitlistDialog && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !waitlistLoading) setShowJoinWaitlistDialog(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="join-waitlist-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-orange-500 px-6 py-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">Waitlist registration</p>
              <h2 id="join-waitlist-title" className="mt-1 text-xl font-bold">Join the {selectedTicket.name} waitlist?</h2>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">A place on the waitlist is not a ticket.</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900">If a ticket becomes available, you may receive an opportunity to book it. Joining does not guarantee availability.</p>
              </div>
              <p className="mt-4 text-xs text-neutral-600"><span className="font-semibold text-neutral-900">Event:</span> {event.title}</p>
              <p className="mt-1 text-xs text-neutral-600"><span className="font-semibold text-neutral-900">Pass:</span> {selectedTicket.name}</p>
              {bookingError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{bookingError}</p>}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={waitlistLoading} onClick={() => setShowJoinWaitlistDialog(false)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={waitlistLoading} onClick={() => void confirmJoinWaitlist()} className="rounded-lg bg-gradient-to-r from-rose-700 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{waitlistLoading ? 'Joining waitlist…' : 'Confirm and join'}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </AttendeeLayout>
  );
}

function DateTile({ date }: { date: Date }) {
  return (
    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white text-center">
      <span className="text-[8px] font-bold uppercase text-rose-600">{date.toLocaleDateString('en-ZA', { month: 'short' })}</span>
      <span className="text-sm font-extrabold leading-tight">{date.toLocaleDateString('en-ZA', { day: 'numeric' })}</span>
    </span>
  );
}

function formatPrice(amount: number): string {
  return amount === 0 ? 'Free' : `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ?? fallback
    : fallback;
}

function VendorEventLayout({ children, eventTitle }: { children: ReactNode; eventTitle?: string }) {
  return (
    <PageWrapper>
      <div className="vendor-events-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />
          <div className="min-w-0 flex-1">
            <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-1 text-[8px] font-semibold text-[#333]">
                <VendorMenuButton />
                <Link to="/vendor/events" className="shrink-0 hover:text-[#171717]">Find events</Link>
                {eventTitle && (
                  <>
                    <span className="text-[#aaa]">/</span>
                    <span className="truncate">{eventTitle}</span>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>
            <main className="px-3.5 pb-4 pt-4">{children}</main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function VendorEventContent({
  event,
  start,
  end,
  fillPercent,
  applicationsOpen,
  vendorApproved,
  vendorApprovalMessage,
}: {
  event: Event;
  start: Date;
  end: Date;
  fillPercent: number;
  applicationsOpen: boolean;
  vendorApproved: boolean;
  vendorApprovalMessage: string;
}) {
  const registrationOpensAt = new Date(event.registrationOpensAt ?? event.createdAt);
  const registrationClosesAt = new Date(event.registrationClosesAt ?? event.startTime);
  const now = new Date();
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-extrabold leading-5 tracking-tight text-[#151515]">{event.title}</h1>
          <p className="mt-0.5 truncate text-[8px] text-[#777]">{event.venue} · {start.toLocaleDateString('en-ZA', { dateStyle: 'medium' })}</p>
        </div>
        <Link
          to="/vendor/events"
          className="vendor-button inline-flex min-h-9 shrink-0 items-center rounded-md border border-[#dedede] bg-white px-2 text-[7px] font-semibold text-[#444] hover:bg-[#f5f5f5]"
        >
          All events
        </Link>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="min-w-0 space-y-2 lg:col-span-2">
          <article className="min-w-0 overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <div className="relative h-[68px] overflow-hidden bg-gradient-to-br from-[#ff8c63] via-[#f14b2d] to-[#f97316]">
              {event.bannerImageUrl ? (
                <img src={event.bannerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <span className="absolute -left-4 top-6 h-16 w-16 rounded-full bg-[#ffb45c]" />
                  <span className="absolute left-[27%] top-8 h-20 w-20 rounded-full bg-[#ad2c18]/75" />
                  <span className="absolute right-2 -top-5 h-12 w-12 rounded-full bg-[#ffb46b]/70" />
                </>
              )}
              <div className="absolute left-1 top-1 rounded-md bg-white/95 px-1.5 py-1 text-[6px] font-bold uppercase text-[#c54821]">
                {event.category} · {event.eventType.replace('_', ' ')}
              </div>
            </div>
            <div className="p-2">
              <h2 className="text-[10px] font-extrabold leading-3 text-[#202020]">Event details</h2>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                <EventDetailTile label="Starts" value={start.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })} />
                <EventDetailTile label="Ends" value={end.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })} />
                <EventDetailTile label="Venue" value={event.venue} />
                <EventDetailTile label="Capacity" value={`${event.availableCapacity} of ${event.capacity} places left`} />
              </div>
              <div className="mt-1.5">
                <div className="mb-0.5 flex justify-between text-[6px] text-[#777]">
                  <span>{event.capacity - event.availableCapacity} registered</span>
                  <span>{fillPercent}% full</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#eee]">
                  <div className="h-full rounded-full bg-[#f15a2a]" style={{ width: `${fillPercent}%` }} />
                </div>
              </div>
            </div>
          </article>

          <section className="rounded-lg border border-[#e5e5e5] bg-white p-2">
            <h2 className="text-[9px] font-extrabold leading-3 text-[#171717]">About this event</h2>
            <p className="mt-1 whitespace-pre-line text-[8px] leading-relaxed text-[#666]">{event.description}</p>
          </section>
        </div>

        <aside className="min-w-0">
          <section className="rounded-lg border border-[#e5e5e5] bg-white p-2">
            <h2 className="text-[9px] font-extrabold leading-3 text-[#171717]">Vendor spaces</h2>
            <div className="mt-1.5 rounded-md bg-[#f7f7f7] px-2 py-1.5">
              <p className="text-[6px] leading-[8px] text-[#777]">Stands left</p>
              <p className="text-[8px] font-bold leading-[10px] text-[#333]">
                {event.availableVendorStands} of {event.vendorStandsAvailable}
              </p>
            </div>
            <div className="mt-1 rounded-md bg-[#f7f7f7] px-2 py-1.5">
              <p className="text-[6px] leading-[8px] text-[#777]">Rate</p>
              <p className="text-[8px] font-bold leading-[10px] text-[#333]">
                R{event.vendorStandRatePerSqm.toLocaleString('en-ZA')}/m²
              </p>
            </div>

            <div className="mt-2">
              {!applicationsOpen ? (
                <div className="flex min-h-[21px] items-center justify-center rounded-md bg-[#f1f1f1] px-2 text-center text-[7px] font-semibold text-[#888]">
                  {now < registrationOpensAt
                    ? `Applications open ${registrationOpensAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}`
                    : `Applications closed ${registrationClosesAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}`}
                </div>
              ) : event.availableVendorStands <= 0 ? (
                <div className="flex min-h-[21px] items-center justify-center rounded-md bg-[#f1f1f1] px-2 text-center text-[7px] font-semibold text-[#888]">
                  All stands taken
                </div>
              ) : vendorApproved ? (
                <Link
                  to={`/vendor/events/${event.id}/apply`}
                  className="vendor-button flex min-h-10 items-center justify-center rounded-md bg-[#111] px-2 py-1 text-[8px] font-bold text-white transition hover:bg-[#333]"
                >
                  Apply for a stand
                </Link>
              ) : (
                <div className="rounded-md border border-[#ffe3a2] bg-[#fff9e8] p-2 text-[7px] leading-relaxed text-[#8a5a00]">
                  <p>{vendorApprovalMessage}</p>
                  <Link to="/vendor/profile" className="mt-1 inline-block font-bold underline">Business profile</Link>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function EventDetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[#f7f7f7] px-2 py-1.5">
      <p className="text-[6px] leading-[8px] text-[#777]">{label}</p>
      <p className="mt-0.5 truncate text-[7px] font-semibold leading-[9px] text-[#333]">{value}</p>
    </div>
  );
}
