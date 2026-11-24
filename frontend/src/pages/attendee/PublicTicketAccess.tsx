import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import TicketQrCode from '@/components/attendee/TicketQrCode';
import { getTicketsByAccessToken, type PublicTicketAccess as PublicTicketAccessData } from '@/services/ticketService';

export default function PublicTicketAccess() {
  const { token = '' } = useParams();
  const [booking, setBooking] = useState<PublicTicketAccessData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTicketsByAccessToken(token)
      .then(response => { if (active) setBooking(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError(loadError)
          ? loadError.response?.data?.message ?? 'This ticket link is unavailable.'
          : 'This ticket link is unavailable.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const eventStart = booking ? new Date(booking.event.startTime) : null;
  const eventEnd = booking ? new Date(booking.event.endTime) : null;

  return (
    <main className="ticket-access-page min-h-screen bg-[#fafafa] px-4 py-8 text-neutral-900 sm:py-12">
      <div className="ticket-access-content mx-auto max-w-2xl">
        <Link to="/" className="ticket-access-brand mb-6 inline-flex items-center gap-2 text-sm font-extrabold text-neutral-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ed1744] to-[#ff6a00] text-white">E</span>
          EventMS
        </Link>

        {loading ? (
          <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">Loading your ticket…</section>
        ) : !booking ? (
          <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <h1 className="text-xl font-extrabold">Ticket link unavailable</h1>
            <p role="alert" className="mt-2 text-sm text-neutral-600">{error || 'This ticket link may be invalid or the booking is no longer confirmed.'}</p>
          </section>
        ) : (
          <>
            <header className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Booking confirmed</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{booking.event.title}</h1>
              <p className="mt-2 text-sm text-neutral-600">
                {eventStart && !Number.isNaN(eventStart.getTime()) ? eventStart.toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'short' }) : 'Event time unavailable'}
                {eventEnd && !Number.isNaN(eventEnd.getTime()) ? ` – ${eventEnd.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}` : ''}
                {' · '}{booking.event.venue || 'Online event'}
              </p>
              <p className="mt-2 text-xs text-neutral-500">Booking reference <span className="font-mono font-bold text-neutral-800">{booking.reference}</span></p>
            </header>

            <div className="ticket-download-controls mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm text-neutral-600">Download a PDF copy with the same event details and QR codes shown below.</p>
              <button
                type="button"
                onClick={() => window.print()}
                className="shrink-0 rounded-lg bg-gradient-to-r from-[#ed1744] to-[#ff6a00] px-4 py-2 text-sm font-bold text-white hover:brightness-95"
              >
                Download ticket PDF
              </button>
            </div>

            <div className="ticket-access-list space-y-4">
              {booking.tickets.map((ticket, index) => (
                <article key={ticket.id} className="ticket-access-card overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{ticket.type} ticket {index + 1}</p>
                      <h2 className="mt-1 font-mono text-sm font-extrabold">{ticket.referenceNumber}</h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{ticket.status === 'USED' ? 'Checked in' : ticket.status === 'CANCELLED' ? 'Cancelled' : 'Confirmed'}</span>
                  </div>
                  {ticket.status === 'ACTIVE' ? (
                    <div className="px-5 py-4 text-center">
                      <TicketQrCode payload={ticket.qrPayload} />
                      <p className="mt-2 text-xs text-neutral-500">Present this QR code at the event entrance.</p>
                    </div>
                  ) : (
                    <p className="px-5 py-6 text-center text-sm text-neutral-600">This ticket is {ticket.status === 'USED' ? 'already checked in' : 'no longer valid'}.</p>
                  )}
                </article>
              ))}
            </div>
            <p className="ticket-access-notice mt-5 text-center text-xs text-neutral-500">Keep this link private. Anyone with the link can view these tickets.</p>
          </>
        )}
      </div>
    </main>
  );
}
