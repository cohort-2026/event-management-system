import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { createEvent, getManagedEvent, publishEvent, updateEvent } from '@/services/eventService';
import { getOrganizerProfile } from '@/services/organizerService';
import type { CreateEventDto, Event, EventType } from '@/types/event';
import type { ProfileApprovalStatus } from '@/types/user';

interface TicketForm {
  name: string;
  description: string;
  price: string;
  quantity: string;
}

interface EventForm {
  title: string;
  description: string;
  category: string;
  eventType: EventType;
  venue: string;
  meetingDetails: string;
  startTime: string;
  endTime: string;
  capacity: string;
  vendorStandRatePerSqm: string;
  bannerImageUrl: string;
  ticketTypes: TicketForm[];
}

const EMPTY_TICKET: TicketForm = { name: 'General admission', description: '', price: '0', quantity: '' };
const EMPTY_FORM: EventForm = {
  title: '',
  description: '',
  category: '',
  eventType: 'IN_PERSON',
  venue: '',
  meetingDetails: '',
  startTime: '',
  endTime: '',
  capacity: '',
  vendorStandRatePerSqm: '',
  bannerImageUrl: '',
  ticketTypes: [{ ...EMPTY_TICKET }],
};

const asLocalDateTime = (iso: string): string => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const getApiError = (error: unknown, fallback: string): string =>
  axios.isAxiosError(error) ? (error.response?.data?.message ?? fallback) : fallback;

const toForm = (event: Event): EventForm => ({
  title: event.title,
  description: event.description,
  category: event.category,
  eventType: event.eventType,
  venue: event.eventType === 'ONLINE' && event.venue === 'Online' ? '' : event.venue,
  meetingDetails: event.meetingDetails ?? '',
  startTime: asLocalDateTime(event.startTime),
  endTime: asLocalDateTime(event.endTime),
  capacity: String(event.capacity),
  vendorStandRatePerSqm: String(event.vendorStandRatePerSqm),
  bannerImageUrl: event.bannerImageUrl ?? '',
  ticketTypes: event.ticketTypes.map(ticket => ({
    name: ticket.name,
    description: ticket.description ?? '',
    price: String(ticket.price),
    quantity: String(ticket.quantity),
  })),
});

export default function CreateEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [existingEvent, setExistingEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(isEditing);
  const [loadingProfile, setLoadingProfile] = useState(!isEditing);
  const [profileApprovalStatus, setProfileApprovalStatus] = useState<ProfileApprovalStatus | null>(null);
  const [profileRejectionReason, setProfileRejectionReason] = useState<string | null>(null);
  const [profileCheckError, setProfileCheckError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getManagedEvent(id)
      .then(response => {
        if (!active) return;
        const event = response.data.data;
        setExistingEvent(event);
        setForm(toForm(event));
      })
      .catch(loadError => {
        if (active) setError(getApiError(loadError, 'Event could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoadingEvent(false);
      });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (isEditing) return;
    let active = true;
    getOrganizerProfile()
      .then(response => {
        if (active) {
          setProfileApprovalStatus(response.data.data.profileApprovalStatus);
          setProfileRejectionReason(response.data.data.profileRejectionReason);
        }
      })
      .catch(error => {
        if (active) setProfileCheckError(getApiError(error, 'Your profile could not be checked. Please try again.'));
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => { active = false; };
  }, [isEditing]);

  const updateForm = <K extends keyof EventForm>(key: K, value: EventForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const updateTicket = (index: number, patch: Partial<TicketForm>) => {
    setForm(current => ({
      ...current,
      ticketTypes: current.ticketTypes.map((ticket, ticketIndex) =>
        ticketIndex === index ? { ...ticket, ...patch } : ticket),
    }));
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setError('');
    setNotice('');

    const startTime = new Date(form.startTime);
    const endTime = new Date(form.endTime);
    if (!Number.isFinite(startTime.getTime()) || startTime <= new Date()) {
      setError('Event start date and time must be in the future.');
      return;
    }
    if (!Number.isFinite(endTime.getTime()) || endTime <= startTime) {
      setError('Event end date and time must be after the start date and time.');
      return;
    }
    const capacity = Number(form.capacity);
    const vendorStandRatePerSqm = Number(form.vendorStandRatePerSqm);
    const ticketTypes = form.ticketTypes.map(ticket => ({
      name: ticket.name.trim(),
      description: ticket.description.trim(),
      price: Number(ticket.price),
      quantity: Number(ticket.quantity),
    }));
    if (!Number.isInteger(capacity) || capacity < 1 || ticketTypes.some(ticket =>
      !ticket.name || !Number.isFinite(ticket.price) || ticket.price < 0 ||
      !Number.isInteger(ticket.quantity) || ticket.quantity < 1)) {
      setError('Enter a valid capacity and valid name, price and quantity for each ticket type.');
      return;
    }
    if (ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) !== capacity) {
      setError('The total quantity of all ticket types must equal the event capacity.');
      return;
    }
    if (!Number.isFinite(vendorStandRatePerSqm) || vendorStandRatePerSqm < 0 || vendorStandRatePerSqm > 99_999_999.99 || Math.round(vendorStandRatePerSqm * 100) !== vendorStandRatePerSqm * 100) {
      setError('Enter a vendor stand rate between R0 and R99,999,999.99 per square metre.');
      return;
    }
    if (form.eventType !== 'IN_PERSON' && !form.meetingDetails.trim()) {
      setError('Add online meeting details for online or hybrid events.');
      return;
    }
    if (form.bannerImageUrl.trim()) {
      try {
        const bannerUrl = new URL(form.bannerImageUrl.trim());
        if (!['https:', 'http:'].includes(bannerUrl.protocol)) throw new Error('Unsupported protocol');
      } catch {
        setError('Enter a valid HTTP or HTTPS banner image URL.');
        return;
      }
    }

    const submitter = (formEvent.nativeEvent as SubmitEvent).submitter;
    const publishAfterSave = submitter?.getAttribute('data-submit-action') === 'publish';
    const payload: CreateEventDto = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      eventType: form.eventType,
      venue: form.eventType === 'ONLINE' && !form.venue.trim() ? 'Online' : form.venue.trim(),
      meetingDetails: form.meetingDetails.trim() || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      date: startTime.toISOString(),
      capacity,
      vendorStandRatePerSqm,
      isFree: ticketTypes.every(ticket => ticket.price === 0),
      bannerImageUrl: form.bannerImageUrl.trim() || undefined,
      ticketTypes: ticketTypes.map(({ name, description, price, quantity }) => ({
        name, description: description || undefined, price, quantity,
      })),
    };

    setSaving(true);
    try {
      const saved = isEditing && id
        ? await updateEvent(id, payload)
        : await createEvent(payload);
      let event = saved.data.data;
      if (publishAfterSave) {
        try {
          const published = await publishEvent(event.id);
          event = published.data.data;
          setNotice(published.data.message ?? 'Event published and is now available to attendees.');
        } catch (publishError) {
          setExistingEvent(event);
          setError(`Event was saved as a draft, but could not be published: ${getApiError(publishError, 'Please try again.')}`);
          if (!isEditing) navigate(`/organizer/events/${event.id}/edit`, { replace: true });
          return;
        }
      } else {
        setNotice(isEditing ? 'Event changes saved.' : 'Event saved as a draft.');
      }
      setExistingEvent(event);
      setCompleted(true);
    } catch (submitError) {
      setError(getApiError(submitError, 'The event could not be saved. Check the details and try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingEvent) {
    return <PageWrapper><p className="py-16 text-center text-neutral-500">Loading event…</p></PageWrapper>;
  }
  if (loadingProfile) {
    return <PageWrapper><p role="status" className="py-16 text-center text-neutral-500">Checking your organizer profile…</p></PageWrapper>;
  }
  if (!isEditing && (profileCheckError || profileApprovalStatus !== 'APPROVED')) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-neutral-900">Event creation unavailable</h1>
          <p role={profileCheckError ? 'alert' : 'status'} className="mt-3 text-sm text-amber-900">
            {profileCheckError || 'Please complete the profile and try again. Your profile must be approved by an admin before creating events.'}
          </p>
          {!profileCheckError && profileApprovalStatus === 'PENDING_APPROVAL' && (
            <p className="mt-2 text-sm text-amber-900">Your profile is awaiting admin review. You can create events after it is approved.</p>
          )}
          {!profileCheckError && profileApprovalStatus === 'REJECTED' && profileRejectionReason && (
            <section className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <h2 className="font-bold text-rose-900">Admin feedback</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-rose-800">{profileRejectionReason}</p>
            </section>
          )}
          <Link to="/organizer/profile" className="mt-5 inline-flex">
            <Button type="button">Complete your profile</Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }
  if (isEditing && error && !existingEvent) {
    return <PageWrapper><p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</p></PageWrapper>;
  }
  if (isEditing && existingEvent && !['DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'PUBLISHED'].includes(existingEvent.status)) {
    return (
      <PageWrapper>
        <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-800">This event can no longer be edited.</p>
        <Link to="/organizer" className="mt-4 inline-block text-brand-700">Back to dashboard</Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Organizer"
          subtitle="Operations"
          items={[
            { label: 'Overview', to: '/organizer', icon: <span aria-hidden="true">⌂</span> },
            { label: 'Create event', to: '/organizer/events/new', icon: <span aria-hidden="true">＋</span> },
            { label: 'My events', to: '/organizer/events', icon: <span aria-hidden="true">▦</span> },
          ]}
        />
        <section className="flex-1 min-w-0">
          <DashboardHeader
            title={isEditing ? 'Edit event' : 'Create an event'}
            subtitle="Complete the event details, ticket tiers, and venue information."
            breadcrumbs={[
              { label: 'Dashboard', to: '/organizer' },
              { label: isEditing ? 'Edit event' : 'Create event', to: '/organizer/events/new' },
            ]}
          />

          {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {(existingEvent?.status === 'DRAFT' || existingEvent?.status === 'REJECTED') && existingEvent.rejectionReason && (
            <section className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <h2 className="font-bold text-rose-900">Admin feedback</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-rose-800">{existingEvent.rejectionReason}</p>
              <p className="mt-2 text-xs text-rose-700">Update the event details, then publish it when ready.</p>
            </section>
          )}

          {completed ? (
            <section role="status" className="max-w-3xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-black text-neutral-900">{existingEvent?.status === 'PUBLISHED' ? 'Event published' : 'Event saved'}</h2>
              <p className="mt-2 text-sm text-neutral-600">{notice}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/organizer"><Button type="button">Back to my events</Button></Link>
                <Button type="button" variant="secondary" onClick={() => setCompleted(false)}>Continue editing</Button>
              </div>
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-4xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Event details</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Required fields must be complete before saving. Changes to a published event’s date, time, venue, capacity, or ticket prices require admin approval.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input label="Event title" value={form.title} onChange={event => updateForm('title', event.target.value)} minLength={3} maxLength={150} required />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Description" value={form.description} onChange={event => updateForm('description', event.target.value)} minLength={20} maxLength={5000} required helperText="Describe what attendees can expect." />
                </div>
                <Input label="Category" value={form.category} onChange={event => updateForm('category', event.target.value)} minLength={2} maxLength={80} required />
                <Select
                  label="Event type"
                  value={form.eventType}
                  onChange={event => updateForm('eventType', event.target.value as EventType)}
                  options={[
                    { value: 'IN_PERSON', label: 'In person' },
                    { value: 'ONLINE', label: 'Online' },
                    { value: 'HYBRID', label: 'Hybrid' },
                  ]}
                />
                {form.eventType !== 'ONLINE' && (
                  <Input label="Venue" value={form.venue} onChange={event => updateForm('venue', event.target.value)} maxLength={250} required />
                )}
                {form.eventType !== 'IN_PERSON' && (
                  <div className="md:col-span-2">
                    <Textarea label="Online meeting details" value={form.meetingDetails} onChange={event => updateForm('meetingDetails', event.target.value)} maxLength={2000} required helperText="Add the meeting URL or access instructions." />
                  </div>
                )}
                <Input label="Start date and time" type="datetime-local" value={form.startTime} onChange={event => updateForm('startTime', event.target.value)} required />
                <Input label="End date and time" type="datetime-local" min={form.startTime} value={form.endTime} onChange={event => updateForm('endTime', event.target.value)} required />
                <Input label="Event capacity" type="number" min={1} max={1_000_000} step={1} value={form.capacity} onChange={event => updateForm('capacity', event.target.value)} required />
                <Input label="Vendor stand rate (ZAR per m²)" type="number" min={0} max={99_999_999.99} step={0.01} value={form.vendorStandRatePerSqm} onChange={event => updateForm('vendorStandRatePerSqm', event.target.value)} required helperText="The approved stand invoice is calculated from this rate and the requested area. Enter 0 if the event will not accept stand applications." />
                <Input label="Banner image URL (optional)" type="url" maxLength={2048} value={form.bannerImageUrl} onChange={event => updateForm('bannerImageUrl', event.target.value)} placeholder="https://example.com/banner.jpg" />
              </div>

              {form.bannerImageUrl && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Banner preview</p>
                  <img src={form.bannerImageUrl} alt="Event banner preview" className="max-h-56 w-full rounded-lg object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
                </div>
              )}

              <section className="mt-8 border-t border-neutral-100 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Ticket types</h2>
                    <p className="mt-1 text-sm text-neutral-500">Ticket quantities must add up to event capacity.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={form.ticketTypes.length >= 20}
                    onClick={() => setForm(current => ({ ...current, ticketTypes: [...current.ticketTypes, { ...EMPTY_TICKET, name: '' }] }))}
                  >
                    Add ticket type
                  </Button>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  {form.ticketTypes.map((ticket, index) => (
                    <div key={index} className="rounded-xl border border-neutral-200 p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Ticket name" value={ticket.name} onChange={event => updateTicket(index, { name: event.target.value })} minLength={2} maxLength={80} required />
                        <Textarea label="Description (optional)" rows={2} value={ticket.description} onChange={event => updateTicket(index, { description: event.target.value })} maxLength={500} />
                        <Input label="Price (ZAR, 0 for free)" type="number" min={0} max={99_999_999.99} step={0.01} value={ticket.price} onChange={event => updateTicket(index, { price: event.target.value })} required />
                        <Input label="Quantity" type="number" min={1} max={1_000_000} step={1} value={ticket.quantity} onChange={event => updateTicket(index, { quantity: event.target.value })} required />
                      </div>
                      {form.ticketTypes.length > 1 && (
                        <button type="button" className="mt-3 text-sm font-semibold text-rose-700 hover:text-rose-900" onClick={() => setForm(current => ({ ...current, ticketTypes: current.ticketTypes.filter((_, ticketIndex) => ticketIndex !== index) }))}>
                          Remove ticket type
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-neutral-600">
                  Total ticket quantity: {form.ticketTypes.reduce((sum, ticket) => sum + (Number(ticket.quantity) || 0), 0)}
                  {form.capacity && Number(form.capacity) !== form.ticketTypes.reduce((sum, ticket) => sum + (Number(ticket.quantity) || 0), 0) && (
                    <span className="ml-2 text-rose-700">Must equal capacity ({form.capacity}).</span>
                  )}
                </p>
              </section>

              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-5">
                <Link to="/organizer"><Button type="button" variant="secondary">Cancel</Button></Link>
                <Button type="submit" name="action" value="draft" data-submit-action="draft" variant="outline" loading={saving}>
                  {isEditing ? 'Save changes' : 'Save draft'}
                </Button>
                {(!existingEvent || ['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(existingEvent.status)) && (
                  <Button type="submit" name="action" value="publish" data-submit-action="publish" loading={saving}>
                    Save and publish event
                  </Button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
