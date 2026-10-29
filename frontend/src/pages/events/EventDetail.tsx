import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import type { Event } from '@/types/event';
import type { BadgeVariant } from '@/components/ui/Badge';
import { getEventById } from '@/services/eventService';

const statusVariant: Record<string, BadgeVariant> = {
  PUBLISHED: 'success', DRAFT: 'default', PENDING_APPROVAL: 'warning', REJECTED: 'danger', CANCELLED: 'danger', COMPLETED: 'info',
};

export default function EventDetail() {
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadedId, setLoadedId] = useState('');
  const [error, setError] = useState('');
  const { id = '' } = useParams();

  useEffect(() => {
    let active = true;
    getEventById(id)
      .then(response => {
        if (active) {
          setEvent(response.data.data);
          setError('');
          setLoadedId(id);
        }
      })
      .catch(() => {
        if (active) {
          setEvent(null);
          setError('Event not found or no longer available.');
          setLoadedId(id);
        }
      });
    return () => { active = false; };
  }, [id]);

  if (loadedId !== id) return <PageWrapper><p className="py-12 text-center text-neutral-500">Loading event...</p></PageWrapper>;
  if (!event) return <PageWrapper><div role="alert" className="py-12 text-center text-neutral-600">{error || 'Event not found.'}<p><Link to="/events" className="text-brand-600">Browse events</Link></p></div></PageWrapper>;

  const date = new Date(event.date);
  const filled = event.capacity - event.availableCapacity;
  const fillPct = Math.round((filled / event.capacity) * 100);

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link to="/events" className="hover:text-brand-600 transition-colors">Events</Link>
        <span>/</span>
        <span className="text-neutral-600 truncate">{event.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: details ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="h-3 bg-brand-600" />
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">{event.category}</span>
                  <h1 className="text-2xl font-bold text-neutral-900 mt-1">{event.title}</h1>
                </div>
                <Badge variant={statusVariant[event.status] ?? 'default'}>
                  {event.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon="📅" label="Date & Time" value={date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} />
                <InfoRow icon="📍" label="Venue" value={event.venue} />
                <InfoRow icon="🎟" label="Ticket price" value={event.isFree ? 'Free' : `R${event.price}`} />
                <InfoRow icon="👥" label="Capacity" value={`${event.availableCapacity} spots remaining of ${event.capacity}`} />
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>{filled} registered</span>
                  <span>{fillPct}% full</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${fillPct > 80 ? 'bg-rose-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-3">About this event</h2>
            <div className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{event.description}</div>
          </div>
        </div>

        {/* ── Right: booking card ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 flex flex-col gap-4 sticky top-20">
            <div>
              <p className="text-2xl font-bold text-neutral-900">{event.isFree ? 'Free' : `R${event.price}`}</p>
              <p className="text-sm text-neutral-400">per person</p>
            </div>

            {event.availableCapacity === 0 ? (
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 text-center font-medium">
                Sold out
              </div>
            ) : user ? (
              <Button className="w-full">
                {event.isFree ? 'Register now' : 'Book ticket'}
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login">
                  <Button className="w-full">Sign in to register</Button>
                </Link>
                <Link to="/register" className="text-center text-sm text-brand-600 hover:text-brand-700">
                  Don't have an account? Register
                </Link>
              </div>
            )}

            <div className="border-t border-neutral-100 pt-4 flex flex-col gap-2 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Instant digital ticket
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fast check-in on the day
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-neutral-700 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}
