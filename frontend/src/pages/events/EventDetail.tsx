import { Link, useParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { mockEventsWithDetails } from '@/data/mockEvents';
import type { Event, EventTicketType } from '@/types/event';
import type { BadgeVariant } from '@/components/ui/Badge';

const statusVariant: Record<string, BadgeVariant> = {
  PUBLISHED: 'success', DRAFT: 'default', PENDING_APPROVAL: 'warning', CANCELLED: 'danger', COMPLETED: 'info',
};

export default function EventDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const event = mockEventsWithDetails.find(item => item.id === id);
  if (!event) {
    return (
      <PageWrapper>
        <div role="alert" className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <p className="font-semibold text-neutral-800">This sample event could not be found.</p>
          <Link to="/events" className="mt-4 inline-block text-sm font-bold text-brand-700 hover:text-brand-900">Browse published events</Link>
        </div>
      </PageWrapper>
    );
  }

  const date = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : undefined;
  const seatsLeft = Math.max(0, Math.min(event.capacity, event.availableCapacity));
  const filled = event.capacity - seatsLeft;
  const fillPct = event.capacity > 0 ? Math.min(100, Math.round((filled / event.capacity) * 100)) : 0;
  const ticketTypes = event.ticketTypes ?? fallbackTicketTypes(event);
  const bookingClosedMessage = getBookingClosedMessage(event, ticketTypes);
  const bookingOpen = bookingClosedMessage === null;

  return (
    <PageWrapper>
      <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link to="/events" className="hover:text-brand-600 transition-colors">Events</Link>
        <span>/</span>
        <span className="text-neutral-600 truncate">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="relative h-48 overflow-hidden bg-gradient-to-r from-brand-800 via-brand-600 to-cyan-500 sm:h-64">
              {event.imageUrl && (
                <img
                  src={event.imageUrl}
                  alt={`${event.title} event`}
                  onError={image => {
                    image.currentTarget.style.display = 'none';
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{event.category}</span>
                  <h1 className="mt-1 text-2xl font-bold text-neutral-900">{event.title}</h1>
                </div>
                <Badge variant={bookingOpen ? statusVariant[event.status] ?? 'default' : 'danger'}>
                  {bookingOpen ? event.status.replace(/_/g, ' ') : bookingClosedMessage}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-2">
                <InfoRow
                  icon="📅"
                  label="Date & time"
                  value={`${formatDate(date)} · ${formatTime(date)}${endDate ? `–${isSameDay(date, endDate) ? '' : `${formatDate(endDate)} · `}${formatTime(endDate)}` : ''}`}
                />
                <InfoRow icon="📍" label="Venue" value={event.venue} />
                <InfoRow icon="🌍" label="Location" value={event.location ?? event.venue} />
                <InfoRow
                  icon="🎟"
                  label="Admission"
                  value={event.isFree ? 'Free event' : `Paid event · from ${formatPrice(ticketTypes[0]?.price ?? event.price ?? 0)}`}
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-neutral-500">
                  <span>{filled} registered</span>
                  <span>{seatsLeft} seats left · {fillPct}% full</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-neutral-100"
                  role="progressbar"
                  aria-label="Event capacity"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={fillPct}
                >
                  <div
                    className={`h-full rounded-full transition-all ${fillPct > 80 ? 'bg-rose-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">About this event</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">{event.description}</p>
          </section>

          {event.organizer && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">Organizer</h2>
              <p className="font-semibold text-neutral-800">{event.organizer.name}</p>
              {event.organizer.description && <p className="mt-1 text-sm text-neutral-500">{event.organizer.description}</p>}
              {event.organizer.email && (
                <a className="mt-2 inline-block text-sm font-medium text-brand-700 hover:text-brand-900" href={`mailto:${event.organizer.email}`}>
                  {event.organizer.email}
                </a>
              )}
            </section>
          )}

          <EventInformationSection
            title="Event rules"
            items={event.rules}
            emptyMessage="No additional event rules have been provided."
          />
          <EventInformationSection
            title="Accessibility"
            items={event.accessibilityInformation}
            emptyMessage="Accessibility information has not been provided. Contact the organizer for details."
          />
          <EventInformationSection
            title="Attendee requirements"
            items={event.attendeeRequirements}
            emptyMessage="No additional attendee requirements have been provided."
          />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900">Tickets</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {event.isFree ? 'Free registration' : 'Choose your ticket'}
            </p>

            <div className="mt-4 space-y-3">
              {ticketTypes.map(ticket => (
                <TicketOption key={ticket.name} ticket={ticket} isFree={event.isFree} />
              ))}
            </div>

            {event.bookingDeadline && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                <span className="font-semibold">Booking deadline: </span>
                {formatDateTime(new Date(event.bookingDeadline))}
              </p>
            )}

            {event.cancellationPolicy && (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <h3 className="text-sm font-semibold text-neutral-800">Cancellation & refunds</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{event.cancellationPolicy}</p>
              </div>
            )}

            <div className="mt-5">
              {!bookingOpen ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
                    {bookingClosedMessage}
                  </div>
                  <Button className="w-full" disabled={!bookingOpen}>
                    {bookingClosedMessage}
                  </Button>
                </div>
              ) : user ? (
                <Button className="w-full" aria-label={event.isFree ? 'RSVP for this free event' : 'Get tickets for this paid event'}>
                  {event.isFree ? 'RSVP' : 'Get Tickets'}
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login">
                    <Button className="w-full">
                      Sign in to {event.isFree ? 'RSVP' : 'Get Tickets'}
                    </Button>
                  </Link>
                  <Link to="/register" className="text-center text-sm text-brand-600 hover:text-brand-700">
                    Don&apos;t have an account? Register
                  </Link>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-neutral-400">
              {event.isFree ? 'No payment required for this event.' : 'Review ticket details and cancellation terms before booking.'}
            </p>
          </section>
        </aside>
      </div>
    </PageWrapper>
  );
}

function getBookingClosedMessage(event: Event, ticketTypes: EventTicketType[]): string | null {
  if (event.status === 'CANCELLED') return 'Event cancelled';
  if (event.status === 'COMPLETED') return 'Event has ended';
  if (event.status !== 'PUBLISHED') return 'Registration unavailable';
  if (event.bookingOpen === false) return 'Bookings are closed for this event';
  if (event.availableCapacity <= 0 || ticketTypes.every(ticket => ticket.availableQuantity <= 0)) {
    return event.isFree ? 'Fully booked' : 'Sold out';
  }
  return null;
}

function fallbackTicketTypes(event: Event): EventTicketType[] {
  return [{
    name: event.isFree ? 'Free admission' : 'General admission',
    price: event.isFree ? 0 : event.price ?? 0,
    availableQuantity: event.availableCapacity,
    ...(event.bookingDeadline && { bookingDeadline: event.bookingDeadline }),
  }];
}

function TicketOption({ ticket, isFree }: { ticket: EventTicketType; isFree: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900">{ticket.name}</h3>
          <p className={`mt-1 text-sm font-bold ${isFree ? 'text-emerald-700' : 'text-neutral-800'}`}>
            {isFree ? 'Free' : formatPrice(ticket.price)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          ticket.availableQuantity === 0 ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-600'
        }`}>
          {ticket.availableQuantity === 0 ? (isFree ? 'Fully booked' : 'Sold out') : `${ticket.availableQuantity} available`}
        </span>
      </div>
      {ticket.bookingDeadline && (
        <p className="mt-2 text-xs text-neutral-500">Sales close {formatDateTime(new Date(ticket.bookingDeadline))}</p>
      )}
    </div>
  );
}

function EventInformationSection({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items?: string[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">{title}</h2>
      {items?.length ? (
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-neutral-600">
          {items.map(item => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      )}
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-lg leading-none">{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-neutral-700">{value}</p>
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  return `R${price.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

function isSameDay(first: Date, second: Date): boolean {
  return first.toDateString() === second.toDateString();
}
