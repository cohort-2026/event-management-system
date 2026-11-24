import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import AttendeeLayout from '@/features/attendee/components/AttendeeLayout';
import EventArtwork from '@/features/attendee/components/EventArtwork';
import TicketQrCode from '@/features/attendee/components/TicketQrCode';
import Spinner from '@/components/legacy/Spinner';
import { useAuth } from '@/context/useAuth';
import { getTicketById } from '@/features/tickets/services/ticketService';
import type { Ticket } from '@/types/ticket';

export default function AttendeeTicket() {
  const { ticketId = '' } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getTicketById(ticketId)
      .then(response => {
        if (active) setTicket(response.data.data);
      })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError(loadError)
          ? loadError.response?.data?.message ?? 'Your ticket could not be loaded.'
          : 'Your ticket could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [ticketId]);

  if (loading) {
    return <AttendeeLayout><div className="flex justify-center py-20"><Spinner /></div></AttendeeLayout>;
  }

  if (!ticket || !ticket.event) {
    return (
      <AttendeeLayout>
        <section className="mx-auto max-w-xl rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p role="alert" className="font-semibold text-neutral-800">{error || 'Ticket details are unavailable.'}</p>
          <Link to="/attendee/tickets" className="mt-4 inline-block text-sm font-semibold text-rose-700">
            Back to my tickets
          </Link>
        </section>
      </AttendeeLayout>
    );
  }

  const event = ticket.event;
  const cancelled = ticket.status === 'CANCELLED';
  const checkedIn = ticket.status === 'USED';
  const bookingStatus = ticket.booking?.status ?? ticket.bookingStatus;
  const paymentStatus = ticket.booking?.paymentStatus ?? ticket.paymentStatus;
  const bookingConfirmed = bookingStatus === 'CONFIRMED' &&
    (paymentStatus === 'NOT_REQUIRED' || paymentStatus === 'PAID');
  const unavailable = !cancelled && !bookingConfirmed;
  const canShowQr = !cancelled && !checkedIn && !unavailable && Boolean(ticket.qrPayload);
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);

  return (
    <AttendeeLayout mainClassName="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4">
        <Link to="/attendee/tickets" className="text-sm font-semibold text-neutral-600 hover:text-neutral-950">
          ← My tickets
        </Link>
      </div>

      <article className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm ${cancelled ? 'opacity-80' : ''}`}>
        <EventArtwork
          title={event.title}
          bannerImageUrl={event.bannerImageUrl}
          className={`h-28 sm:h-32 ${cancelled ? 'grayscale' : ''}`}
        />

        {checkedIn && (
          <div className="bg-violet-600 px-6 py-5 text-center text-white">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-bold text-violet-600">✓</span>
            <p className="mt-2 text-lg font-bold">You&apos;re checked in</p>
            <p className="text-xs text-violet-100">
              {ticket.checkedInAt
                ? new Date(ticket.checkedInAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
                : 'Entry confirmed'}
              {' · Main entrance'}
            </p>
          </div>
        )}

        <div className="p-5 sm:p-7">
          {cancelled && (
            <div className="mb-5 rounded-lg bg-neutral-100 px-4 py-3">
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-neutral-600">Cancelled</span>
              <p className="mt-2 text-sm text-neutral-600">
                This ticket is no longer valid for entry.
              </p>
            </div>
          )}
          {unavailable && (
            <div role="status" className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This ticket is unavailable because its booking or payment has not been confirmed.
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {ticket.ticketType ?? ticket.type}
              </p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-950">{event.title}</h1>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              cancelled || unavailable ? 'bg-neutral-100 text-neutral-600' : checkedIn ? 'bg-violet-100 text-violet-800' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {cancelled ? 'Cancelled' : checkedIn ? 'Checked in' : unavailable ? 'Unavailable' : 'Confirmed'}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 border-b border-dashed border-neutral-200 pb-5 text-sm sm:grid-cols-2">
            <TicketDetail label="Date" value={eventStart.toLocaleDateString('en-ZA', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })} />
            <TicketDetail label="Doors" value={eventStart.toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit',
            })} />
            <TicketDetail label="Venue" value={event.venue || 'Online event'} wide />
            <TicketDetail label="Name" value={`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim() || 'Attendee'} />
            <TicketDetail label="Ticket reference" value={ticket.referenceNumber} mono />
            {ticket.bookingReference && <TicketDetail label="Booking reference" value={ticket.bookingReference} mono />}
          </dl>

          {canShowQr && (
            <div className="py-6 text-center">
              <TicketQrCode payload={ticket.qrPayload!} />
              <p className="mt-3 font-mono text-lg font-bold tracking-widest text-neutral-950">
                {ticket.referenceNumber}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Turn your brightness up at the door</p>
            </div>
          )}

          {!cancelled && !checkedIn && !unavailable && !ticket.qrPayload && (
            <p role="alert" className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              The check-in code is unavailable. Please contact the event organizer before arriving.
            </p>
          )}

          {checkedIn && (
            <div className="mt-5 rounded-lg bg-violet-50 p-4">
              <p className="text-sm font-semibold text-violet-950">Enjoy the event</p>
              <p className="mt-1 text-xs text-violet-800">
                Your ticket was checked in at {ticket.checkedInAt
                  ? new Date(ticket.checkedInAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'the entrance'}.
              </p>
            </div>
          )}
        </div>
      </article>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={cancelled}
          onClick={() => downloadCalendarEvent(event.title, event.venue, eventStart, eventEnd)}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to calendar
        </button>
        {event.venue && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Directions
          </a>
        )}
        {cancelled && (
          <Link
            to={`/events/${ticket.eventId}`}
            className="w-full rounded-lg bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2.5 text-center text-sm font-bold text-white"
          >
            Book again
          </Link>
        )}
      </div>
    </AttendeeLayout>
  );
}

function TicketDetail({ label, value, mono = false, wide = false }: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className={`mt-0.5 break-words font-medium text-neutral-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function downloadCalendarEvent(title: string, venue: string, start: Date, end: Date) {
  const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventMS//Attendee Ticket//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@eventms`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `LOCATION:${escapeIcs(venue)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'event'}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
