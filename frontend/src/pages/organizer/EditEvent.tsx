import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import EventForm from '@/pages/organizer/EventForm';
import { getMyEvents, submitForApproval, updateEvent } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function EditEvent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyEvents()
      .then(response => setEvent(response.data.data.find(item => item.id === id) ?? null))
      .catch(() => setError('Could not load this event.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageWrapper><p>Loading event...</p></PageWrapper>;
  if (!event) return <PageWrapper><p role="alert" className="text-rose-600">{error || 'Event not found.'}</p></PageWrapper>;
  if (event.status !== 'DRAFT' && event.status !== 'REJECTED') {
    return <PageWrapper><p>This event cannot be edited while its status is {event.status.replace('_', ' ')}.</p></PageWrapper>;
  }

  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Edit event</h1>
      {event.status === 'REJECTED' && (
        <div className="mb-5 max-w-3xl rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Changes requested by the reviewer</p>
          <p className="mt-1">{event.rejectionReason}</p>
        </div>
      )}
      {error && <p role="alert" className="mb-4 text-sm text-rose-600">{error}</p>}
      <EventForm
        event={event}
        submitLabel={event.status === 'REJECTED' ? 'Save corrections and resubmit' : 'Save draft'}
        onSubmit={async data => {
          await updateEvent(id, data);
          if (event.status === 'REJECTED') await submitForApproval(id);
          navigate('/organizer');
        }}
      />
      <Link to="/organizer" className="mt-4 inline-block text-sm text-brand-600 hover:text-brand-700">Back to dashboard</Link>
    </PageWrapper>
  );
}
