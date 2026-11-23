import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import EventArtwork from '@/components/attendee/EventArtwork';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { cancelBooking, getMyBookings } from '@/services/bookingService';
import type { Booking } from '@/types/booking';

type BookingTab = 'upcoming' | 'waitlist' | 'past' | 'cancelled';

export default function AttendeeBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [tab, setTab] = useState<BookingTab>('upcoming');

  const loadBookings = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const response = await getMyBookings();
      setBookings(response.data.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Your bookings could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMyBookings()
      .then(response => {
        if (active) setBookings(response.data.data);
      })
      .catch(loadError => {
        if (active) setError(getErrorMessage(loadError, 'Your bookings could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!confirmingId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirmingId(null);
        setCancellationReason('');
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [confirmingId]);

  const handleCancel = async (booking: Booking, cancellationReason: string) => {
    const reason = cancellationReason.trim();
    if (!reason) {
      setError('Enter a reason before cancelling your booking.');
      return;
    }

    setError('');
    setNotice('');
    setProcessingId(booking.id);
    try {
      const response = await cancelBooking(booking.id, reason);
      setBookings(current => current.map(item => item.id === booking.id
        ? {
          ...item,
          status: 'CANCELLED',
          paymentStatus: item.paymentStatus === 'PENDING' ? 'FAILED' : item.paymentStatus,
          tickets: item.tickets.map(ticket => ({ ...ticket, status: 'CANCELLED' })),
          ticket: item.ticket ? { ...item.ticket, status: 'CANCELLED' } : null,
        }
        : item));
      setNotice(response.data.message || 'Booking cancelled.');
      setConfirmingId(null);
      setCancellationReason('');
    } catch (cancelError) {
      setError(getErrorMessage(cancelError, 'This booking could not be cancelled.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayment = (bookingId: string) => {
    navigate(`/attendee/payment/simulate?bookingId=${encodeURIComponent(bookingId)}`);
  };

  const shareEvent = async (booking: Booking) => {
    const url = new URL(`/events/${booking.eventId}`, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: booking.event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Event link copied to clipboard.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setError('The event link could not be shared. Please copy the event URL from its page.');
    }
  };

  const now = new Date();
  const upcomingBookings = bookings.filter(booking =>
    booking.status !== 'CANCELLED' && new Date(booking.event.startTime) >= now);
  const pastBookings = bookings.filter(booking =>
    booking.status !== 'CANCELLED' && new Date(booking.event.startTime) < now);
  const cancelledBookings = bookings.filter(booking => booking.status === 'CANCELLED');
  const visibleBookings = tab === 'upcoming'
    ? upcomingBookings
    : tab === 'past'
      ? pastBookings
      : tab === 'cancelled'
        ? cancelledBookings
        : [];

  return (
      <AttendeeLayout mainClassName="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              My bookings
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review your reservations, complete pending payments, or cancel upcoming bookings.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/attendee" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">Discover events</Link>
            <Button variant="secondary" size="sm" onClick={() => void loadBookings()} loading={loading}>Refresh</Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1" role="tablist" aria-label="Booking status">
            <BookingTabButton selected={tab === 'upcoming'} onClick={() => setTab('upcoming')} label="Upcoming" count={upcomingBookings.length} />
            <button
              type="button"
              disabled
              title="Waitlists are not available yet."
              className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-400"
            >
              Waitlist <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px]">0</span>
            </button>
            <BookingTabButton selected={tab === 'past'} onClick={() => setTab('past')} label="Past" count={pastBookings.length} />
            <BookingTabButton selected={tab === 'cancelled'} onClick={() => setTab('cancelled')} label="Cancelled" count={cancelledBookings.length} />
          </div>
          <Link to="/attendee/tickets" className="text-xs font-semibold text-neutral-700 hover:text-neutral-950">My tickets →</Link>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : visibleBookings.length ? (
          <div className="space-y-2">
            {visibleBookings.map(booking => {
              const canCancel = booking.status !== 'CANCELLED' &&
                new Date(booking.event.startTime) > new Date() &&
                !booking.tickets.some(ticket => ticket.status === 'USED');
              const canPay = booking.status === 'PENDING' && booking.paymentStatus === 'PENDING';

              return (
                <article key={booking.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
                  <BookingDate date={new Date(booking.event.startTime)} />
                  <EventArtwork title="" className="h-10 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-[180px] flex-1">
                    <Link to={`/events/${booking.eventId}`} className="block truncate text-sm font-bold text-neutral-950 hover:text-rose-700">
                      {booking.event.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {new Date(booking.event.startTime).toLocaleDateString('en-ZA', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {booking.event.venue}
                      {' · '}
                      {booking.eventTicketType?.name ?? booking.ticketType}
                      {' · '}
                      {booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}
                      {' · '}
                      {booking.totalAmount === 0 ? 'Free' : formatPrice(booking.totalAmount)}
                      {' · '}
                      <span className="font-mono">{booking.reference}</span>
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} paymentStatus={booking.paymentStatus} />
                  {canPay && (
                    <Button size="sm" onClick={() => handlePayment(booking.id)}>
                      Pay now
                    </Button>
                  )}
                  {booking.tickets.length > 0 && (
                    <div className="w-full border-t border-neutral-100 pt-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-neutral-800">
                          {booking.tickets.length} {booking.tickets.length === 1 ? 'ticket' : 'tickets'}
                        </p>
                        <span className="text-[10px] text-neutral-500">Each ticket has its own entry code</span>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {booking.tickets.map((ticket, index) => (
                          <li key={ticket.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-neutral-600">
                                {booking.eventTicketType?.name ?? ticket.type} · Ticket {index + 1}
                                {ticket.status === 'USED' && <span className="ml-1 text-emerald-700">· Checked in</span>}
                                {ticket.status === 'CANCELLED' && <span className="ml-1 text-neutral-500">· Cancelled</span>}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-xs font-bold text-neutral-950">{ticket.referenceNumber}</p>
                            </div>
                            <Link
                              to={`/attendee/tickets/${ticket.id}`}
                              className="shrink-0 rounded-md bg-neutral-950 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-neutral-800"
                              aria-label={`View ticket ${index + 1}, ${ticket.referenceNumber}`}
                            >
                              View
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`More actions for ${booking.event.title}`}
                      aria-expanded={menuId === booking.id}
                      onClick={() => setMenuId(current => current === booking.id ? null : booking.id)}
                      className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      ⋯
                    </button>
                    {menuId === booking.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => { setMenuId(null); void shareEvent(booking); }}
                          className="block w-full rounded px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          Share event
                        </button>
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellationReason('');
                              setConfirmingId(booking.id);
                              setMenuId(null);
                            }}
                            className="block w-full rounded px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            Cancel booking
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-14 text-center">
            <p className="font-semibold text-neutral-800">
              {tab === 'upcoming' ? 'No upcoming bookings' : tab === 'past' ? 'No past events' : tab === 'cancelled' ? 'No cancelled bookings' : 'No waitlisted events'}
            </p>
            <p className="mt-1 text-sm text-neutral-500">Find an event and register to see it here.</p>
            <Link to="/attendee" className="mt-4 inline-block text-sm font-semibold text-rose-700 hover:text-rose-800">
              Discover events
            </Link>
          </div>
        )}

        {confirmingId && (() => {
          const booking = bookings.find(item => item.id === confirmingId);
          if (!booking) return null;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
              onMouseDown={event => {
                if (event.target === event.currentTarget) {
                  setConfirmingId(null);
                  setCancellationReason('');
                }
              }}
            >
              <section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600" aria-hidden="true">!</span>
                  <div>
                    <h2 id="cancel-title" className="text-base font-bold text-neutral-950">Cancel your booking?</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      Your {booking.eventTicketType?.name ?? booking.ticketType} for <strong>{booking.event.title}</strong> will be cancelled and its place released.
                    </p>
                    {booking.paymentStatus === 'PAID' && (
                      <p className="mt-2 text-xs font-medium text-rose-700">Completed payments are not refunded.</p>
                    )}
                  </div>
                </div>
                <form
                  onSubmit={submitEvent => {
                    submitEvent.preventDefault();
                    void handleCancel(booking, cancellationReason);
                  }}
                >
                  <label htmlFor={`booking-cancellation-reason-${booking.id}`} className="mt-4 block text-sm font-semibold text-neutral-900">
                    Reason for cancellation
                  </label>
                  <textarea
                    id={`booking-cancellation-reason-${booking.id}`}
                    required
                    maxLength={500}
                    rows={3}
                    value={cancellationReason}
                    onChange={changeEvent => setCancellationReason(changeEvent.target.value)}
                    placeholder="Tell the organizer why you are cancelling"
                    className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  <div className="mt-1 flex justify-end text-xs text-neutral-500">
                    {cancellationReason.length}/500
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setConfirmingId(null);
                        setCancellationReason('');
                      }}
                    >
                      Keep my booking
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="danger"
                      loading={processingId === booking.id}
                      disabled={!cancellationReason.trim()}
                    >
                      Cancel booking
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          );
        })()}
    </AttendeeLayout>
  );
}

function BookingStatusBadge({ status, paymentStatus }: Pick<Booking, 'status' | 'paymentStatus'>) {
  const label = status === 'CANCELLED'
    ? 'Cancelled'
    : paymentStatus === 'PENDING'
      ? 'Payment pending'
      : paymentStatus === 'FAILED'
        ? 'Payment failed'
        : status === 'CONFIRMED'
          ? 'Confirmed'
          : 'Pending';
  const style = status === 'CANCELLED' || paymentStatus === 'FAILED'
    ? 'bg-neutral-100 text-neutral-600'
    : paymentStatus === 'PENDING'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-emerald-100 text-emerald-800';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}

function BookingDate({ date }: { date: Date }) {
  return (
    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white">
      <span className="text-[8px] font-bold uppercase text-neutral-500">{date.toLocaleDateString('en-ZA', { month: 'short' })}</span>
      <span className="text-base font-extrabold leading-tight">{date.toLocaleDateString('en-ZA', { day: '2-digit' })}</span>
    </span>
  );
}

function BookingTabButton({ selected, onClick, label, count }: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        selected ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-600 hover:text-neutral-950'
      }`}
    >
      {label} <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px]">{count}</span>
    </button>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ?? fallback
    : fallback;
}

function formatPrice(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

