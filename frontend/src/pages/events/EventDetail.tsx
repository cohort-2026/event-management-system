import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
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
                <Badge variant="success">APPROVED</Badge>
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
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">Sold out</div>
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
