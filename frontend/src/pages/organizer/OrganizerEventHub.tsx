import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import Badge, { type BadgeVariant } from '@/components/legacy/Badge';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { getEventRegistrations, getManagedEvent, type EventRegistration } from '@/services/eventService';
import { getEventApplications } from '@/services/vendorService';
import type { Event } from '@/types/event';
import type { VendorApplication } from '@/types/vendor';

const eventStatusVariant: Record<Event['status'], BadgeVariant> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'info',
};

const applicationStatusVariant: Record<VendorApplication['status'], BadgeVariant> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
};

const responseMessage = (error: unknown, fallback: string): string => (
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message ?? fallback : fallback
);

const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) =>
  new Date(value).toLocaleString('en-ZA', options);

const dateKey = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

function StatCard({ label, value, detail, accent }: { label: string; value: string | number; detail: string; accent: string }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-3 h-1 w-10 rounded-full ${accent}`} aria-hidden="true" />
      <p className="text-xs font-medium text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-600">{detail}</p>
    </article>
  );
}

function TicketSales({ event }: { event: Event }) {
  const tickets = event.ticketTypes.map(ticket => ({
    ...ticket,
    sold: Math.max(0, ticket.quantity - ticket.availableQuantity),
  }));
  const colors = ['bg-rose-600', 'bg-orange-500', 'bg-amber-400', 'bg-slate-900'];

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="ticket-sales-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="ticket-sales-title" className="font-bold text-neutral-900">Sales by ticket type</h2>
          <p className="mt-1 text-xs text-neutral-500">Sold places are calculated from each ticket type’s remaining quantity.</p>
        </div>
        <Link to={`/organizer/events/${event.id}/registrations`} className="shrink-0 text-xs font-semibold text-brand-700 hover:underline">
          Guest list
        </Link>
      </div>
      {tickets.length === 0 ? (
        <p className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No ticket types are configured for this event.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {tickets.map((ticket, index) => (
            <div key={ticket.id}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-neutral-800">{ticket.name} · {ticket.price === 0 ? 'Free' : `R ${ticket.price.toFixed(2)}`}</span>
                <span className="text-neutral-600">{ticket.sold} / {ticket.quantity} sold · {ticket.availableQuantity} left</span>
              </div>
              <div
                role="progressbar"
                aria-label={`${ticket.name} tickets sold`}
                aria-valuemin={0}
                aria-valuemax={ticket.quantity}
                aria-valuenow={ticket.sold}
                className="h-2 overflow-hidden rounded-full bg-neutral-100"
              >
                <div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${Math.min(100, ticket.sold / Math.max(1, ticket.quantity) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BookingsChart({ registrations }: { registrations: EventRegistration[] }) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 9);
  const counts = new Map<string, number>();
  for (const registration of registrations) {
    if (registration.status === 'CANCELLED') continue;
    const created = new Date(registration.createdAt);
    if (created >= start && created <= now) {
      const key = dateKey(created);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const days = Array.from({ length: 10 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, count: counts.get(dateKey(date)) ?? 0 };
  });
  const maximum = Math.max(1, ...days.map(day => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="bookings-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="bookings-chart-title" className="font-bold text-neutral-900">Bookings per day</h2>
          <p className="mt-1 text-xs text-neutral-500">Non-cancelled registrations over the last 10 days.</p>
        </div>
        <span className="text-xs text-neutral-500">{total} in this period</span>
      </div>
      {total === 0 ? (
        <p className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No booking activity in the last 10 days.</p>
      ) : (
        <div role="img" aria-label={`Bookings per day for the last 10 days, ${total} bookings total`} className="mt-5 grid h-36 grid-cols-10 items-end gap-2 border-b border-neutral-200 px-1">
          {days.map(day => (
            <div key={dateKey(day.date)} className="flex h-full flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-medium text-neutral-600">{day.count || ''}</span>
              <div
                className={`w-full min-w-2 rounded-t-sm ${day.count > 0 ? 'bg-rose-500' : 'bg-neutral-100'}`}
                style={{ height: `${day.count > 0 ? Math.max(10, day.count / maximum * 100) : 3}%` }}
                title={`${formatDate(day.date.toISOString(), { month: 'short', day: 'numeric' })}: ${day.count}`}
              />
              <span className="text-[9px] text-neutral-400">{formatDate(day.date.toISOString(), { month: 'numeric', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function OrganizerEventHub() {
  const { id = '' } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[] | null>(null);
  const [applications, setApplications] = useState<VendorApplication[] | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [eventError, setEventError] = useState('');
  const [registrationsError, setRegistrationsError] = useState('');
  const [applicationsError, setApplicationsError] = useState('');

  useEffect(() => {
    let active = true;
    setEvent(null);
    setRegistrations(null);
    setApplications(null);
    setEventLoading(true);
    setRegistrationsLoading(true);
    setApplicationsLoading(true);
    setEventError('');
    setRegistrationsError('');
    setApplicationsError('');

    if (!id) {
      setEventError('A valid event is required.');
      setEventLoading(false);
      setRegistrationsLoading(false);
      setApplicationsLoading(false);
      return () => { active = false; };
    }

    getManagedEvent(id)
      .then(response => { if (active) setEvent(response.data.data); })
      .catch(error => { if (active) setEventError(responseMessage(error, 'Event details could not be loaded.')); })
      .finally(() => { if (active) setEventLoading(false); });
    getEventRegistrations(id)
      .then(response => { if (active) setRegistrations(response.data.data); })
      .catch(error => { if (active) setRegistrationsError(responseMessage(error, 'Guest list data could not be loaded.')); })
      .finally(() => { if (active) setRegistrationsLoading(false); });
    getEventApplications(id)
      .then(response => { if (active) setApplications(response.data.data); })
      .catch(error => { if (active) setApplicationsError(responseMessage(error, 'Stand request data could not be loaded.')); })
      .finally(() => { if (active) setApplicationsLoading(false); });

    return () => { active = false; };
  }, [id]);

  const booked = event ? Math.max(0, event.capacity - event.availableCapacity) : 0;
  const checkedIn = registrations?.filter(registration =>
    registration.status !== 'CANCELLED' && registration.ticket?.status === 'USED').length ?? 0;
  const canEdit = event ? event.status === 'DRAFT' || event.status === 'PUBLISHED' : false;
  const pendingStandRequests = applications?.filter(application => application.status === 'PENDING_REVIEW').length ?? 0;
  const approvedStands = applications?.filter(application => application.status === 'APPROVED').length ?? 0;
  const daysUntilEvent = event
    ? Math.ceil((new Date(event.startTime).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
    : null;
  const daysLabel = daysUntilEvent === null ? '—' : daysUntilEvent < 0 ? 'Past' : daysUntilEvent === 0 ? 'Today' : String(daysUntilEvent);
  const recentApplications = (applications ?? [])
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4);

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader
            title={event?.title ?? 'Event hub'}
            subtitle="Event information and the actions available to you."
            breadcrumbs={[{ label: 'My events', to: '/organizer/events' }, { label: event?.title ?? 'Event' }]}
          />

          {eventLoading ? (
            <div role="status" className="flex min-h-56 items-center justify-center gap-3 text-sm text-neutral-500">
              <Spinner /> Loading event hub…
            </div>
          ) : eventError || !event ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              {eventError || 'Event details could not be loaded.'}
              <Link to="/organizer/events" className="ml-2 font-semibold underline">Back to My Events</Link>
            </div>
          ) : (
            <>
              <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="relative h-44 overflow-hidden bg-gradient-to-r from-rose-600 via-orange-500 to-amber-300 sm:h-56">
                  {event.bannerImageUrl && (
                    <img src={event.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-transparent" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
                    <div className="min-w-0 text-white">
                      <p className="text-xs font-semibold text-white/80">
                        My events <span aria-hidden="true">/</span> {event.title}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{event.title}</h1>
                        <Badge variant={eventStatusVariant[event.status]}>{event.status.replace('_', ' ')}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-white/90">
                        {formatDate(event.startTime)} – {formatDate(event.endTime)} · {event.venue}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canEdit && (
                        <Link to={`/organizer/events/${event.id}/edit`}>
                          <Button type="button" variant="secondary" size="sm">Edit event</Button>
                        </Link>
                      )}
                      {event.status === 'PUBLISHED' && (
                        <Link to={`/events/${event.id}`}>
                          <Button type="button" size="sm">View public page</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <nav aria-label="Event management sections" className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 sm:px-6">
                  <span aria-current="page" className="border-b-2 border-rose-600 px-4 py-3 text-sm font-bold text-rose-700">Overview</span>
                  <Link to={`/organizer/events/${event.id}/registrations`} className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-600 hover:text-brand-700">Guest list</Link>
                  <Link to={`/organizer/events/${event.id}/check-in`} className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-600 hover:text-brand-700">Check-in</Link>
                  <Link to={`/organizer/events/${event.id}/vendors`} className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-600 hover:text-brand-700">Stands</Link>
                </nav>
              </section>

              {registrationsError && <p role="alert" className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{registrationsError}</p>}
              {applicationsError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{applicationsError}</p>}

              <section aria-label="Event summary" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Booked"
                  value={`${booked} / ${event.capacity}`}
                  detail={event.capacity > 0 ? `${Math.round(booked / event.capacity * 100)}% of capacity` : 'No capacity set'}
                  accent="bg-rose-600"
                />
                <StatCard
                  label="Checked in"
                  value={registrationsLoading ? '…' : registrationsError ? '—' : checkedIn}
                  detail={registrationsLoading ? 'Loading guest data' : 'Tickets marked as used'}
                  accent="bg-orange-500"
                />
                <StatCard
                  label="Stand requests"
                  value={applicationsLoading ? '…' : applicationsError ? '—' : pendingStandRequests}
                  detail={applicationsLoading ? 'Loading request data' : `${approvedStands} approved · ${event.vendorStandsAvailable} spaces`}
                  accent="bg-amber-400"
                />
                <StatCard
                  label="Days to go"
                  value={daysLabel}
                  detail={formatDate(event.startTime, { dateStyle: 'medium' })}
                  accent="bg-pink-300"
                />
              </section>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.9fr)]">
                <TicketSales event={event} />
                <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="event-details-title">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="event-details-title" className="font-bold text-neutral-900">Event details</h2>
                      <p className="mt-1 text-xs text-neutral-500">Dates, venue, and current event status.</p>
                    </div>
                    {canEdit && <Link to={`/organizer/events/${event.id}/edit`} className="text-xs font-semibold text-brand-700 hover:underline">Edit</Link>}
                  </div>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-xs text-neutral-500">Starts</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">{formatDate(event.startTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Ends</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">{formatDate(event.endTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Registration opens</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">{formatDate(event.registrationOpensAt ?? event.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Registration closes</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">{formatDate(event.registrationClosesAt ?? event.startTime)}</dd>
                    </div>
                    {event.status === 'COMPLETED' && event.closedAt && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Closed</dt>
                        <dd className="mt-1 font-semibold text-neutral-800">{formatDate(event.closedAt)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-neutral-500">Location</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">{event.venue}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Event type</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">{event.eventType.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Stand allocation</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {applicationsLoading ? 'Loading…' : applicationsError ? 'Unavailable' : `${approvedStands} / ${event.vendorStandsAvailable} approved`}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.9fr)]">
                {registrationsLoading ? (
                  <section role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
                    <Spinner /> Loading booking activity…
                  </section>
                ) : registrationsError ? (
                  <section className="rounded-xl border border-neutral-200 bg-white p-5">
                    <h2 className="font-bold text-neutral-900">Bookings per day</h2>
                    <p className="mt-3 text-sm text-neutral-500">Booking activity is unavailable.</p>
                  </section>
                ) : (
                  <BookingsChart registrations={registrations ?? []} />
                )}

                <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="stand-activity-title">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="stand-activity-title" className="font-bold text-neutral-900">Recent stand requests</h2>
                      <p className="mt-1 text-xs text-neutral-500">
                        {applicationsLoading ? 'Loading requests…' : `${pendingStandRequests} awaiting review`}
                      </p>
                    </div>
                    <Link to={`/organizer/events/${event.id}/vendors`} className="text-xs font-semibold text-brand-700 hover:underline">Review</Link>
                  </div>
                  {applicationsLoading ? (
                    <div role="status" className="py-8 text-center text-sm text-neutral-500"><Spinner /></div>
                  ) : applicationsError ? (
                    <p className="mt-4 text-sm text-neutral-500">Stand request activity is unavailable.</p>
                  ) : recentApplications.length === 0 ? (
                    <p className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No stand requests have been submitted for this event.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-neutral-100">
                      {recentApplications.map(application => (
                        <li key={application.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-neutral-800">
                              {application.vendor?.vendorProfile?.businessName || application.companyName}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">{formatDate(application.createdAt)}</p>
                          </div>
                          <Badge variant={applicationStatusVariant[application.status]}>{application.status.replace('_', ' ')}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}

