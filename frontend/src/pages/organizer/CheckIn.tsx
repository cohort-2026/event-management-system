import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import OrganizerPageLayout from '@/components/organizer/OrganizerPageLayout';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getManagedEvent } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function CheckIn() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const pageError = id ? error : 'A valid event is required.';

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };

    getManagedEvent(id)
      .then(response => { if (active) setEvent(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data?.message ?? 'Event details could not be loaded.'
          : 'Event details could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id]);

  return (
    <OrganizerPageLayout
      title="Ticket check-in"
      subtitle={event?.title ?? 'Check attendees in to your event.'}
      breadcrumbs={[{ label: 'My events', to: '/organizer/events' }, { label: 'Ticket check-in' }]}
    >
          {loading ? (
            <div className="flex justify-center rounded-2xl border border-neutral-200 bg-white py-16"><Spinner /></div>
          ) : pageError ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</p>
          ) : (
            <section className="dashboard-panel p-6 sm:p-8">
              <p className="text-sm leading-6 text-neutral-600">
                The current ticket API supports check-in by ticket ID, but does not provide an event ticket list or scanner workflow. Ticket check-in management is not available on this page yet.
              </p>
              {event && (
                <p className="mt-4 text-sm font-medium text-neutral-800">
                  Event capacity: {event.capacity} places
                </p>
              )}
              <Link to="/organizer/tickets" className="mt-5 inline-flex">
                <Button variant="secondary">Back to ticket management</Button>
              </Link>
            </section>
          )}
    </OrganizerPageLayout>
  );
}
