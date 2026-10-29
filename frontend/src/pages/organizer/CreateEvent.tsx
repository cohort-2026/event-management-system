import { useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import EventForm from '@/pages/organizer/EventForm';
import { createEvent } from '@/services/eventService';

export default function CreateEvent() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Create event</h1>
      <EventForm
        submitLabel="Save draft"
        onSubmit={async data => {
          const response = await createEvent(data);
          navigate(`/organizer/events/${response.data.data.id}/edit`);
        }}
      />
    </PageWrapper>
  );
}
