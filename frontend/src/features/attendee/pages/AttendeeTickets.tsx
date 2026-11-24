import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AttendeeLayout from '@/features/attendee/components/AttendeeLayout';
import EventArtwork from '@/features/attendee/components/EventArtwork';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { getMyTickets, type TicketPagination } from '@/features/tickets/services/ticketService';
import type { Ticket } from '@/types/ticket';

const PAGE_SIZE = 12;

export default function AttendeeTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<TicketPagination>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTickets = useCallback(async (requestedPage: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await getMyTickets(requestedPage, PAGE_SIZE);
      setTickets(response.data.data);
      setPagination(response.data.pagination);
    } catch (loadError) {
      setError(axios.isAxiosError(loadError)
        ? loadError.response?.data?.message ?? 'Your tickets could not be loaded.'
        : 'Your tickets could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTickets(page); }, [loadTickets, page]);

  const visibleTickets = tickets.filter(isDisplayableTicket);

  return (
    <AttendeeLayout mainClassName="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Your entry passes</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-950">My tickets</h1>
          <p className="mt-1 text-sm text-neutral-500">Each ticket has its own reference and entry code.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/attendee/bookings" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">My bookings</Link>
          <Button variant="secondary" size="sm" onClick={() => void loadTickets(page)} loading={loading}>Refresh</Button>
        </div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : visibleTickets.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleTickets.map(ticket => {
              const event = ticket.event;
              const unavailable = ticket.status === 'CANCELLED';
              return (
                <article key={ticket.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <EventArtwork title={event?.title ?? 'Event'} category={ticket.type} bannerImageUrl={event?.bannerImageUrl} className="h-36" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{ticket.ticketType ?? ticket.booking?.eventTicketType?.name ?? ticket.type}</p>
                        <h2 className="mt-1 truncate text-base font-bold text-neutral-950">{event?.title ?? 'Event details unavailable'}</h2>
                      </div>
                      <TicketStatus status={ticket.status} />
                    </div>
                    {event && <p className="mt-2 text-xs text-neutral-600">
                      {new Date(event.startTime).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{new Date(event.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      {event.venue ? ` · ${event.venue}` : ''}
                    </p>}
                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-neutral-100 pt-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-neutral-500">Ticket reference</p>
                        <p className="truncate font-mono text-xs font-bold text-neutral-900">{ticket.referenceNumber}</p>
                        {ticket.bookingReference && <p className="mt-1 truncate text-[10px] text-neutral-500">Booking {ticket.bookingReference}</p>}
                      </div>
                      <Link to={`/attendee/tickets/${ticket.id}`} className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${unavailable ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50' : 'bg-neutral-950 text-white hover:bg-neutral-800'}`}>
                        {unavailable ? 'Details' : 'View ticket'}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Ticket pages">
            <p className="text-xs text-neutral-500">Page {pagination.page} of {Math.max(1, pagination.totalPages)} · {pagination.total} tickets</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages || loading} onClick={() => setPage(current => current + 1)}>Next</Button>
            </div>
          </nav>
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white py-14 text-center">
          <p className="font-semibold text-neutral-800">{tickets.length ? 'No available tickets on this page' : 'No tickets yet'}</p>
          <p className="mt-1 text-sm text-neutral-500">Confirmed tickets for your events will appear here.</p>
          <Link to="/events" className="mt-4 inline-block text-sm font-semibold text-rose-700 hover:text-rose-800">Explore events</Link>
        </section>
      )}
    </AttendeeLayout>
  );
}

function isDisplayableTicket(ticket: Ticket) {
  if (ticket.status === 'CANCELLED') return true;
  const bookingStatus = ticket.booking?.status ?? ticket.bookingStatus;
  const paymentStatus = ticket.booking?.paymentStatus ?? ticket.paymentStatus;
  return bookingStatus === 'CONFIRMED' && (paymentStatus === 'NOT_REQUIRED' || paymentStatus === 'PAID');
}

function TicketStatus({ status }: { status: Ticket['status'] }) {
  const style = status === 'USED' ? 'bg-violet-100 text-violet-800' : status === 'CANCELLED' ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-50 text-emerald-700';
  const label = status === 'USED' ? 'Checked in' : status === 'CANCELLED' ? 'Cancelled' : 'Active';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>{label}</span>;
}
