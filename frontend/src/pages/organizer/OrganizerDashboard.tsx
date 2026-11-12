import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { cancelEvent, completeEvent, getMyEvents, publishEvent } from '@/services/eventService';
import type { Event, EventStatus } from '@/types/event';
import type { BadgeVariant } from '@/components/ui/Badge';

const statusVariant: Record<EventStatus, BadgeVariant> = {
  PUBLISHED: 'success',
  DRAFT: 'default',
  CANCELLED: 'danger',
  COMPLETED: 'info',
};

const statusLabel = (status: EventStatus): string => status === 'PUBLISHED' ? 'PUBLISHED' : status.replace('_', ' ');
const formatDate = (date: string): string => new Date(date).toLocaleString('en-ZA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function OrganizerDashboard() {
  const isMyEventsPage = useLocation().pathname === '/organizer/events';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then(response => {
        if (active) setEvents(response.data.data);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Your events could not be loaded.')
            : 'Your events could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const publish = async (eventId: string) => {
    setError('');
    setNotice('');
    setSubmittingId(eventId);
    try {
      const response = await publishEvent(eventId);
      setNotice(response.data.message ?? 'Event Published');
      const refreshed = await getMyEvents();
      setEvents(refreshed.data.data);
    } catch (publishError) {
      setError(axios.isAxiosError(publishError)
        ? (publishError.response?.data?.message ?? 'Event could not be published.')
        : 'Event could not be published.');
    } finally {
      setSubmittingId(null);
    }
  };

  const cancel = async (event: Event) => {
    if (!window.confirm(`Cancel "${event.title}"? Registered attendees and approved vendors will be notified.`)) return;
    setError('');
    setNotice('');
    setCancellingId(event.id);
    try {
      const response = await cancelEvent(event.id);
      setNotice(response.data.message ?? 'Event cancelled.');
      const refreshed = await getMyEvents();
      setEvents(refreshed.data.data);
    } catch (cancelError) {
      setError(axios.isAxiosError(cancelError)
        ? (cancelError.response?.data?.message ?? 'Event could not be cancelled.')
        : 'Event could not be cancelled.');
    } finally {
      setCancellingId(null);
    }
  };

  const complete = async (event: Event) => {
    setError('');
    setNotice('');
    setCompletingId(event.id);
    try {
      const response = await completeEvent(event.id);
      setNotice(response.data.message ?? 'Event marked as completed.');
      const refreshed = await getMyEvents();
      setEvents(refreshed.data.data);
    } catch (completeError) {
      setError(axios.isAxiosError(completeError)
        ? (completeError.response?.data?.message ?? 'Event could not be completed.')
        : 'Event could not be completed.');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-6">
        <DashboardSidebar
          title="Organizer"
          subtitle="Operations"
          appearance="analytics"
          items={[
            { label: 'Overview', to: '/organizer', icon: <span aria-hidden="true">⌂</span> },
            { label: 'My events', to: '/organizer/events', icon: <span aria-hidden="true">▦</span> },
            { label: 'Create event', to: '/organizer/events/new', icon: <span aria-hidden="true">＋</span> },
            { label: 'My profile', to: '/organizer/profile', icon: <span aria-hidden="true">◎</span> },
          ]}
        />
        <section className="flex-1 min-w-0">
          <DashboardHeader
            title={isMyEventsPage ? 'My events' : 'Organizer Dashboard'}
            subtitle={isMyEventsPage ? 'Create, publish, and manage your events.' : 'Track your event activity and publishing status.'}
            breadcrumbs={isMyEventsPage
              ? [{ label: 'Dashboard', to: '/organizer' }, { label: 'My events' }]
              : [{ label: 'Dashboard', to: '/organizer' }]}
            appearance="analytics"
          />

          {!isMyEventsPage && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard label="Total events" value={events.length} icon={<span aria-hidden="true">▦</span>} color="brand" appearance="analytics" />
              <StatCard label="Published" value={events.filter(event => event.status === 'PUBLISHED').length} icon={<span aria-hidden="true">✓</span>} color="emerald" appearance="analytics" />
              <StatCard label="Drafts" value={events.filter(event => event.status === 'DRAFT').length} icon={<span aria-hidden="true">✎</span>} color="purple" appearance="analytics" />
            </div>
          )}

          {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          {isMyEventsPage && <section className="dashboard-panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <h2 className="font-semibold text-neutral-900">My events</h2>
              <Link to="/organizer/events/new"><Button size="sm">Create event</Button></Link>
            </div>
            {loading ? <div className="flex justify-center py-12"><Spinner /></div> : events.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="font-semibold text-neutral-800">No events yet</p>
                <p className="mt-1 text-sm text-neutral-500">Create your first event to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {events.map(event => (
                  <article key={event.id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-neutral-900">{event.title}</h3>
                          <Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge>
                          <Badge variant="default">{event.category}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-neutral-500">{formatDate(event.startTime)} – {formatDate(event.endTime)}</p>
                        <p className="mt-1 text-sm text-neutral-500">{event.eventType.replace('_', ' ')} · {event.venue}</p>
                        <p className="mt-1 text-xs text-neutral-400">{event.capacity - event.availableCapacity} / {event.capacity} places booked</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link to={`/organizer/events/${event.id}/registrations`}>
                          <Button variant="secondary" size="sm">Registrations</Button>
                        </Link>
                        <Link to={`/organizer/events/${event.id}/vendors`}>
                          <Button variant="secondary" size="sm">Stand requests</Button>
                        </Link>
                        {(['DRAFT', 'PUBLISHED'].includes(event.status)) && (
                          <Link to={`/organizer/events/${event.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              {event.status === 'PUBLISHED' ? 'Edit published event' : 'Edit draft'}
                            </Button>
                          </Link>
                        )}
                        {event.status === 'DRAFT' && (
                          <Button size="sm" loading={submittingId === event.id} onClick={() => void publish(event.id)}>Publish event</Button>
                        )}
                        {event.status === 'PUBLISHED' && (
                          <>
                            {new Date(event.endTime) <= new Date() && <Button size="sm" loading={completingId === event.id} onClick={() => void complete(event)}>Complete event</Button>}
                            <Button variant="danger" size="sm" loading={cancellingId === event.id} onClick={() => void cancel(event)}>Cancel event</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>}
        </section>
      </div>
    </PageWrapper>
  );
}
