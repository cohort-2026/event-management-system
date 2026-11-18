import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';
import NotificationBell from '@/components/layout/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { getEventById } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function EventDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            <Link to="/vendor/events" className="mt-3 inline-flex rounded-md bg-[#111] px-2.5 py-1.5 text-[8px] font-bold text-white">Back to find events</Link>
          </div>
        </VendorEventLayout>
      );
    }

    const fillPercent = event.capacity > 0
      ? Math.round(((event.capacity - event.availableCapacity) / event.capacity) * 100)
      : 0;
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const applicationsOpen = event.status === 'PUBLISHED' && start > new Date();
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

  const fillPercent = event.capacity > 0
    ? Math.round(((event.capacity - event.availableCapacity) / event.capacity) * 100)
    : 0;
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

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
            {event.bannerImageUrl
              ? <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="max-h-96 w-full object-cover" />
              : <div className="h-3 bg-brand-600" />}
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{event.category} · {event.eventType.replace('_', ' ')}</span>
                  <h1 className="mt-1 text-2xl font-bold text-neutral-900">{event.title}</h1>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon="📅" label="Starts" value={start.toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'short' })} />
                <InfoRow icon="⌛" label="Ends" value={end.toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'short' })} />
                {event.venue && <InfoRow icon="📍" label="Venue" value={event.venue} />}
                {event.meetingDetails && <InfoRow icon="🔗" label="Online meeting" value={event.meetingDetails} />}
                <InfoRow icon="👥" label="Capacity" value={`${event.availableCapacity} places remaining of ${event.capacity}`} />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-neutral-500">
                  <span>{event.capacity - event.availableCapacity} registered</span>
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
              {event.ticketTypes.map(ticket => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-neutral-800">{ticket.name}</p>
                    {ticket.description && <p className="mt-1 text-sm text-neutral-500">{ticket.description}</p>}
                    <p className="mt-1 text-xs text-neutral-400">{ticket.availableQuantity} available</p>
                  </div>
                  <p className="font-bold text-neutral-900">{ticket.price === 0 ? 'Free' : `R${ticket.price.toFixed(2)}`}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside>
          <section className="sticky top-20 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {event.isFree ? 'Free' : `From R${Math.min(...event.ticketTypes.filter(ticket => ticket.price > 0).map(ticket => ticket.price)).toFixed(2)}`}
              </p>
              <p className="text-sm text-neutral-400">per ticket</p>
            </div>

            {event.availableCapacity === 0 ? (
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 text-center font-medium">
                Sold out
              </div>
            ) : user ? (
              <Button className="w-full" disabled>Registration coming soon</Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login"><Button className="w-full">Sign in to register</Button></Link>
                <Link to="/register" className="text-center text-sm text-brand-600 hover:text-brand-700">Don't have an account? Register</Link>
              </div>
            )}
          </section>
        </aside>
      </div>
    </PageWrapper>
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

function VendorEventLayout({ children, eventTitle }: { children: ReactNode; eventTitle?: string }) {
  return (
    <PageWrapper>
      <div className="vendor-events-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
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
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-extrabold leading-5 tracking-tight text-[#151515]">{event.title}</h1>
          <p className="mt-0.5 truncate text-[8px] text-[#777]">{event.venue} · {start.toLocaleDateString('en-ZA', { dateStyle: 'medium' })}</p>
        </div>
        <Link
          to="/vendor/events"
          className="inline-flex h-[21px] shrink-0 items-center rounded-md border border-[#dedede] bg-white px-2 text-[7px] font-semibold text-[#444] hover:bg-[#f5f5f5]"
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
                  Vendor applications are closed
                </div>
              ) : event.availableVendorStands <= 0 ? (
                <div className="flex min-h-[21px] items-center justify-center rounded-md bg-[#f1f1f1] px-2 text-center text-[7px] font-semibold text-[#888]">
                  All stands taken
                </div>
              ) : vendorApproved ? (
                <Link
                  to={`/vendor/events/${event.id}/apply`}
                  className="flex h-[21px] items-center justify-center rounded-md bg-[#111] text-[8px] font-bold text-white transition hover:bg-[#333]"
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
