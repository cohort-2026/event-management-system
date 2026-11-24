import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import Button from '@/components/legacy/Button';
import Input from '@/components/legacy/Input';
import Select from '@/components/legacy/Select';
import Textarea from '@/components/legacy/Textarea';
import { createEvent, getManagedEvent, publishEvent, updateEvent, uploadEventBanner } from '@/services/eventService';
import { getOrganizerProfile } from '@/services/organizerService';
import type { CreateEventDto, Event, EventType } from '@/types/event';
import type { ProfileApprovalStatus } from '@/types/user';

interface TicketForm {
  name: string;
  description: string;
  price: string;
  quantity: string;
  isFree: boolean;
  soldQuantity: number;
}

interface EventForm {
  title: string;
  description: string;
  category: string;
  categoryOther: string;
  eventType: EventType;
  venue: string;
  meetingDetails: string;
  directions: string;
  parkingInformation: string;
  startTime: string;
  endTime: string;
  capacity: string;
  vendorStandsAvailable: string;
  bannerImageUrl: string;
  ticketTypes: TicketForm[];
}

const EMPTY_TICKET: TicketForm = { name: 'General admission', description: '', price: '0', quantity: '', isFree: true, soldQuantity: 0 };
const MAX_BANNER_IMAGE_BYTES = 5 * 1024 * 1024;
const BANNER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EVENT_CATEGORIES = [
  'Networking', 'Workshop', 'Training', 'Company Activities', 'other',
];
const COMPANY_ACTIVITIES_API_VALUE = 'Campany Activities';
const CREATE_STEPS = ['Basics', 'When & where', 'Tickets', 'Stands & review'];
const TICKET_TYPE_OPTIONS = [
  'General admission', 'VIP', 'Early bird', 'Student', 'Group or corporate',
];
const EMPTY_FORM: EventForm = {
  title: '',
  description: '',
  category: '',
  categoryOther: '',
  eventType: 'IN_PERSON',
  venue: '',
  meetingDetails: '',
  directions: '',
  parkingInformation: '',
  startTime: '',
  endTime: '',
  capacity: '',
  vendorStandsAvailable: '0',
  bannerImageUrl: '',
  ticketTypes: [{ ...EMPTY_TICKET }],
};

function EventStatusPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader title={title} showNavigation={false} />
          {children}
        </section>
      </div>
    </PageWrapper>
  );
}

const asLocalDateTime = (iso: string): string => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const formatReviewDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
};

const getApiError = (error: unknown, fallback: string): string =>
  axios.isAxiosError(error) ? (error.response?.data?.message ?? fallback) : fallback;

const toForm = (event: Event): EventForm => ({
  title: event.title,
  description: event.description,
  category: event.category === COMPANY_ACTIVITIES_API_VALUE ? 'Company Activities' : EVENT_CATEGORIES.includes(event.category) ? event.category : 'other',
  categoryOther: event.category === COMPANY_ACTIVITIES_API_VALUE || EVENT_CATEGORIES.includes(event.category) ? '' : event.category,
  eventType: event.eventType,
  venue: event.eventType === 'ONLINE' && event.venue === 'Online' ? '' : event.venue,
  meetingDetails: event.meetingDetails ?? '',
  directions: event.directions ?? '',
  parkingInformation: event.parkingInformation ?? '',
  startTime: asLocalDateTime(event.startTime),
  endTime: asLocalDateTime(event.endTime),
  capacity: String(event.capacity),
  vendorStandsAvailable: String(event.vendorStandsAvailable ?? 0),
  bannerImageUrl: event.bannerImageUrl ?? '',
  ticketTypes: event.ticketTypes.map(ticket => ({
    name: ticket.name,
    description: ticket.description ?? '',
    price: String(ticket.price),
    quantity: String(ticket.quantity),
    isFree: ticket.price === 0,
    soldQuantity: Math.max(0, ticket.quantity - ticket.availableQuantity),
  })),
});

export default function CreateEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const formRef = useRef<HTMLFormElement>(null);
  const reviewConfirmed = useRef(false);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [existingEvent, setExistingEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(isEditing);
  const [loadingProfile, setLoadingProfile] = useState(!isEditing);
  const [profileApprovalStatus, setProfileApprovalStatus] = useState<ProfileApprovalStatus | null>(null);
  const [profileRejectionReason, setProfileRejectionReason] = useState<string | null>(null);
  const [profileCheckError, setProfileCheckError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!bannerPreviewUrl.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(bannerPreviewUrl);
  }, [bannerPreviewUrl]);

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

  const reviewChanges = existingEvent ? [
    { label: 'Event title', before: existingEvent.title, after: form.title.trim() },
    {
      label: 'Category',
      before: existingEvent.category === COMPANY_ACTIVITIES_API_VALUE ? 'Company Activities' : existingEvent.category,
      after: form.category === 'other' ? form.categoryOther.trim() : form.category,
    },
    { label: 'Description', before: existingEvent.description, after: form.description.trim() },
    {
      label: 'Event type',
      before: existingEvent.eventType.replace('_', ' '),
      after: form.eventType.replace('_', ' '),
    },
    {
      label: 'Venue',
      before: existingEvent.venue,
      after: form.eventType === 'ONLINE' && !form.venue.trim() ? 'Online' : form.venue.trim(),
    },
    { label: 'Starts', before: formatReviewDate(existingEvent.startTime), after: formatReviewDate(form.startTime) },
    { label: 'Ends', before: formatReviewDate(existingEvent.endTime), after: formatReviewDate(form.endTime) },
    { label: 'Capacity', before: String(existingEvent.capacity), after: form.capacity },
    {
      label: 'Vendor stands',
      before: String(existingEvent.vendorStandsAvailable ?? 0),
      after: form.vendorStandsAvailable,
    },
    {
      label: 'Ticket types',
      before: existingEvent.ticketTypes.map(ticket =>
        `${ticket.name} · ${ticket.price === 0 ? 'Free' : `R ${ticket.price.toFixed(2)}`} · ${ticket.quantity} places${ticket.description ? ` · ${ticket.description}` : ''}`,
      ).join('\n'),
      after: form.ticketTypes.map(ticket =>
        `${ticket.name.trim()} · ${ticket.isFree ? 'Free' : `R ${Number(ticket.price || 0).toFixed(2)}`} · ${ticket.quantity || '0'} places${ticket.description.trim() ? ` · ${ticket.description.trim()}` : ''}`,
      ).join('\n'),
    },
    {
      label: 'Banner image',
      before: existingEvent.bannerImageUrl || 'No image',
      after: bannerImageFile ? `New image: ${bannerImageFile.name}` : form.bannerImageUrl.trim() || 'No image',
    },
    {
      label: 'Meeting details',
      before: existingEvent.meetingDetails || 'Not set',
      after: form.meetingDetails.trim() || 'Not set',
    },
  ].filter(change => change.before !== change.after) : [];

  const validateStep = (): boolean => {
    setError('');
    const controls = Array.from(formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea') ?? []);
    const errors: Record<string, string> = {};
    for (const control of controls) {
      if (!control.willValidate || !control.id) continue;
      const label = control.labels?.[0]?.textContent?.trim() || 'This field';
      const value = control.value.trim();
      if (control.required && !value) {
        errors[control.id] = `${label} is required.`;
      } else if (value && 'minLength' in control && control.minLength > 0 && value.length < control.minLength) {
        errors[control.id] = `${label} must contain at least ${control.minLength} characters.`;
      } else if (!control.validity.valid) {
        errors[control.id] = `${label}: ${control.validationMessage}`;
      }
    }

    if (step === 1) {
      const startTime = new Date(form.startTime);
      const endTime = new Date(form.endTime);
      if (!errors['start-date-and-time'] && (!Number.isFinite(startTime.getTime()) || startTime <= new Date())) {
        errors['start-date-and-time'] = 'Event start date and time must be in the future.';
      }
      if (!errors['end-date-and-time'] && !errors['start-date-and-time'] && (!Number.isFinite(endTime.getTime()) || endTime <= startTime)) {
        errors['end-date-and-time'] = 'Event end date and time must be after the start date and time.';
      }
      const minimumCapacity = existingEvent
        ? Math.max(1, existingEvent.capacity - existingEvent.availableCapacity)
        : 1;
      if (!errors['event-capacity'] && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < minimumCapacity)) {
        errors['event-capacity'] = `Event capacity cannot be less than ${minimumCapacity}.`;
      }
    }

    if (step === 2) {
      const ticketTypes = form.ticketTypes.map(ticket => ({
        name: ticket.name.trim(),
        price: ticket.isFree ? 0 : Number(ticket.price),
        quantity: Number(ticket.quantity),
        isFree: ticket.isFree,
        soldQuantity: ticket.soldQuantity,
      }));
      ticketTypes.forEach((ticket, index) => {
        if (!ticket.name && !errors[`ticket-type-${index}`]) errors[`ticket-type-${index}`] = 'Ticket type is required.';
        if (!ticket.isFree && (!Number.isFinite(ticket.price) || ticket.price <= 0) && !errors[`ticket-price-${index}`]) {
          errors[`ticket-price-${index}`] = 'Price must be greater than zero.';
        }
        if ((!Number.isInteger(ticket.quantity) || ticket.quantity < 1 || ticket.quantity < ticket.soldQuantity) && !errors[`ticket-quantity-${index}`]) {
          errors[`ticket-quantity-${index}`] = `Quantity must be at least ${Math.max(1, ticket.soldQuantity)}.`;
        }
      });
      if (Object.keys(errors).length === 0 && ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) !== Number(form.capacity)) {
        errors['ticket-quantity-0'] = 'The total quantity of all ticket types must equal the event capacity.';
      }
    }

    setFieldErrors(errors);
    const firstInvalid = controls.find(control => errors[control.id]);
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return Object.keys(errors).length === 0;
  };

  const goToNextStep = () => {
    if (!validateStep()) return;
    setStep(current => Math.min(current + 1, CREATE_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousStep = () => {
    setError('');
    setFieldErrors({});
    setStep(current => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addTicketType = () => {
    setForm(current => ({
      ...current,
      ticketTypes: [
        ...current.ticketTypes,
        { ...EMPTY_TICKET, name: `Ticket type ${current.ticketTypes.length + 1}` },
      ],
    }));
  };

  const handleBannerImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!BANNER_IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_BANNER_IMAGE_BYTES) {
      setError('Event images must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setError('');
    setBannerImageFile(file);
    setBannerPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (step < CREATE_STEPS.length - 1) {
      goToNextStep();
      return;
    }
    if (!validateStep()) {
      reviewConfirmed.current = false;
      return;
    }
    setError('');
    setNotice('');

    const showEarlierStepError = (targetStep: number, field: string, message: string) => {
      reviewConfirmed.current = false;
      setFieldErrors({ [field]: message });
      setStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const startTime = new Date(form.startTime);
    const endTime = new Date(form.endTime);
    if (!Number.isFinite(startTime.getTime()) || startTime <= new Date()) {
      showEarlierStepError(1, 'start-date-and-time', 'Event start date and time must be in the future.');
      return;
    }
    if (!Number.isFinite(endTime.getTime()) || endTime <= startTime) {
      showEarlierStepError(1, 'end-date-and-time', 'Event end date and time must be after the start date and time.');
      return;
    }
    const capacity = Number(form.capacity);
    const ticketTypes = form.ticketTypes.map(ticket => ({
      name: ticket.name.trim(),
      description: ticket.description.trim(),
      price: ticket.isFree ? 0 : Number(ticket.price),
      quantity: Number(ticket.quantity),
      isFree: ticket.isFree,
    }));
    const minimumCapacity = existingEvent
      ? Math.max(1, existingEvent.capacity - existingEvent.availableCapacity)
      : 1;
    if (!Number.isInteger(capacity) || capacity < minimumCapacity) {
      showEarlierStepError(1, 'event-capacity', `Event capacity cannot be less than ${minimumCapacity}.`);
      return;
    }
    const invalidTicketIndex = ticketTypes.findIndex((ticket, index) =>
      !ticket.name || !Number.isFinite(ticket.price) || ticket.price < 0 || (!ticket.isFree && ticket.price <= 0) ||
      !Number.isInteger(ticket.quantity) || ticket.quantity < 1 || ticket.quantity < form.ticketTypes[index].soldQuantity);
    if (invalidTicketIndex !== -1) {
      const ticket = ticketTypes[invalidTicketIndex];
      const field = !ticket.name ? 'type' : !ticket.isFree && (!Number.isFinite(ticket.price) || ticket.price <= 0) ? 'price' : 'quantity';
      showEarlierStepError(2, `ticket-${field}-${invalidTicketIndex}`, 'Enter a valid value for this ticket type.');
      return;
    }
    if (ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0) !== capacity) {
      showEarlierStepError(2, 'ticket-quantity-0', 'The total quantity of all ticket types must equal the event capacity.');
      return;
    }
    if (form.eventType !== 'IN_PERSON' && !form.meetingDetails.trim()) {
      showEarlierStepError(1, 'online-meeting-details', 'Add online meeting details for online or hybrid events.');
      return;
    }
    if (form.category === 'other' && !form.categoryOther.trim()) {
      showEarlierStepError(0, 'specify-category', 'Enter a category when selecting other.');
      return;
    }
    if (!bannerImageFile && form.bannerImageUrl.trim()) {
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
    if (
      isEditing &&
      existingEvent?.status === 'PUBLISHED' &&
      !publishAfterSave &&
      reviewChanges.length > 0 &&
      !reviewConfirmed.current
    ) {
      setReviewOpen(true);
      return;
    }
    reviewConfirmed.current = false;
    setSaving(true);
    try {
      const bannerImageUrl = bannerImageFile
        ? (await uploadEventBanner(bannerImageFile)).data.data.url
        : form.bannerImageUrl.trim() || undefined;
      const payload: CreateEventDto = {
        title: form.title.trim(),
        description: form.description.trim(),
        // The API misspells this built-in category; save the displayed name through its custom-category option.
        category: form.category === 'Company Activities' ? 'other' : form.category,
        ...(form.category === 'Company Activities'
          ? { categoryOther: 'Company Activities' }
          : form.category === 'other' ? { categoryOther: form.categoryOther.trim() } : {}),
        eventType: form.eventType,
        venue: form.eventType === 'ONLINE' && !form.venue.trim() ? 'Online' : form.venue.trim(),
        meetingDetails: form.meetingDetails.trim() || undefined,
        directions: form.directions.trim() || undefined,
        parkingInformation: form.parkingInformation.trim() || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        date: startTime.toISOString(),
        capacity,
        vendorStandsAvailable: Number(form.vendorStandsAvailable),
        isFree: ticketTypes.every(ticket => ticket.price === 0),
        bannerImageUrl,
        ticketTypes: ticketTypes.map(ticket => ({
          name: ticket.name,
          description: ticket.description || undefined,
          price: ticket.price,
          quantity: ticket.quantity,
        })),
      };
      const saved = isEditing && id
        ? await updateEvent(id, payload)
        : await createEvent(payload);
      let event = saved.data.data;
      if (publishAfterSave) {
        try {
          const published = await publishEvent(event.id);
          event = published.data.data;
          setNotice(published.data.message ?? 'Event Published');
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

  const capacityValue = Number(form.capacity) || 0;
  const ticketQuantityTotal = form.ticketTypes.reduce((sum, ticket) => sum + (Number(ticket.quantity) || 0), 0);
  const ticketAllocationPercent = capacityValue > 0
    ? Math.min(100, Math.round((ticketQuantityTotal / capacityValue) * 100))
    : 0;
  const confirmLeave = () => (
    (JSON.stringify(form) === JSON.stringify(isEditing && existingEvent ? toForm(existingEvent) : EMPTY_FORM) && !bannerImageFile) ||
    window.confirm('Leave this page? Unsaved event details will be lost.')
  );

  if (loadingEvent) {
    return <EventStatusPage title="Edit event"><p className="py-16 text-center text-neutral-500">Loading event…</p></EventStatusPage>;
  }
  if (loadingProfile) {
    return <EventStatusPage title={isEditing ? 'Edit event' : 'Create event'}><p role="status" className="py-16 text-center text-neutral-500">Checking your organizer profile…</p></EventStatusPage>;
  }
  if (!isEditing && (profileCheckError || profileApprovalStatus !== 'APPROVED')) {
    return (
      <EventStatusPage title="Create event">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-neutral-900">Event creation unavailable</h1>
          <p role={profileCheckError ? 'alert' : 'status'} className="mt-3 text-sm text-amber-900">
            {profileCheckError || 'Please complete your organizer profile and wait for its approval before creating events.'}
          </p>
          {!profileCheckError && profileApprovalStatus === 'PENDING_APPROVAL' && (
            <p className="mt-2 text-sm text-amber-900">Your profile is awaiting review. You can create and publish events after it is approved.</p>
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
      </EventStatusPage>
    );
  }

  function PlusIcon() {
    return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m7-7H5" /></svg>;
  }

  if (isEditing && error && !existingEvent) {
    return <EventStatusPage title="Edit event"><p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</p></EventStatusPage>;
  }
  if (isEditing && existingEvent && !['DRAFT', 'PUBLISHED'].includes(existingEvent.status)) {
    return (
      <EventStatusPage title="Edit event">
        <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-800">This event can no longer be edited.</p>
        <Link to="/organizer" className="mt-4 inline-block text-brand-700">Back to dashboard</Link>
      </EventStatusPage>
    );
  }

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader
            title={isEditing ? 'Edit event' : 'Create event'}
            subtitle={isEditing ? 'Complete the event details, ticket tiers, and venue information.' : undefined}
            topBarSubtitle={!isEditing ? 'Complete the event details, ticket tiers, and venue information.' : undefined}
            showNavigation={isEditing}
            confirmNotificationNavigation={confirmLeave}
            notificationsDisabled={saving}
            breadcrumbs={[
              { label: 'Dashboard', to: '/organizer' },
              { label: isEditing ? 'Edit event' : 'Create event', to: isEditing ? '/organizer/events' : '/organizer/events/new' },
            ]}
          />

          {isEditing && existingEvent?.status === 'PUBLISHED' && (
            <section aria-label="Published event status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-900">Published event</p>
                <p className="mt-1 text-sm text-emerald-800">
                  {Math.max(0, existingEvent.capacity - existingEvent.availableCapacity)} places booked.
                  Changes will be saved to the published event after you review them.
                </p>
              </div>
              <span className="mt-2 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 sm:mt-0">
                PUBLISHED
              </span>
            </section>
          )}

          {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {completed ? (
            <section role="status" className="max-w-3xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-black !text-emerald-800">
                {isEditing ? 'Event changes saved' : existingEvent?.status === 'PUBLISHED' ? 'Event published' : 'Event saved'}
              </h2>
              <p className="mt-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm !text-emerald-800">{notice}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={() => setCompleted(false)}>Continue editing</Button>
              </div>
            </section>
          ) : (
            <form
              ref={formRef}
              id="create-event-form"
              noValidate
              onSubmit={handleSubmit}
              onChange={event => {
                const target = event.target;
                if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) || !target.id) return;
                setFieldErrors(current => {
                  const allocationError = 'The total quantity of all ticket types must equal the event capacity.';
                  const clearAllocation = target.id.startsWith('ticket-quantity-') && current['ticket-quantity-0'] === allocationError;
                  if (!current[target.id] && !clearAllocation) return current;
                  const next = { ...current };
                  delete next[target.id];
                  if (clearAllocation) delete next['ticket-quantity-0'];
                  return next;
                });
              }}
              className="rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <ol aria-label="Event creation steps" className="grid grid-cols-2 gap-3 border-b border-neutral-100 px-5 py-5 sm:grid-cols-4 sm:px-7">
                {CREATE_STEPS.map((label, index) => (
                  <li key={label}>
                    <button
                      type="button"
                      disabled={index > step}
                      aria-current={index === step ? 'step' : undefined}
                      onClick={() => {
                        if (index < step) {
                          setError('');
                          setFieldErrors({});
                          setStep(index);
                        }
                      }}
                      className={`flex w-full items-center gap-2 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                        index === step ? 'text-rose-700' : index < step ? 'text-neutral-700' : 'text-neutral-400'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        index === step
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : index < step
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-neutral-300 bg-white text-neutral-400'
                      }`}>
                        {index < step ? '✓' : index + 1}
                      </span>
                      <span className="truncate">{label}</span>
                      {index < CREATE_STEPS.length - 1 && (
                        <span className="hidden h-px flex-1 bg-neutral-200 sm:block" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ol>

              <div className="p-5 sm:p-7">
                {Object.keys(fieldErrors).length > 0 && (
                  <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    Please correct the highlighted fields.
                  </p>
                )}
                {step === 0 && (
                  <section aria-labelledby="basics-heading">
                    <div className="mb-6">
                      <h2 id="basics-heading" className="text-xl font-bold text-neutral-900">Event basics</h2>
                      <p className="mt-1 text-sm text-neutral-500">Give your event a clear title and tell attendees what to expect.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Input label="Event title" value={form.title} onChange={event => updateForm('title', event.target.value)} error={fieldErrors['event-title']} minLength={3} maxLength={150} required />
                      </div>
                      <Select
                        label="Category"
                        value={form.category}
                        error={fieldErrors.category}
                        onChange={event => {
                          updateForm('category', event.target.value);
                          setFieldErrors(current => {
                            const next = { ...current };
                            delete next['specify-category'];
                            return next;
                          });
                        }}
                        options={EVENT_CATEGORIES.map(category => ({ value: category, label: category }))}
                        placeholder="Choose a category"
                        required
                      />
                      {form.category === 'other' && (
                        <Input
                          label="Specify category"
                          value={form.categoryOther}
                          error={fieldErrors['specify-category']}
                          onChange={event => updateForm('categoryOther', event.target.value)}
                          minLength={2}
                          maxLength={80}
                          required
                        />
                      )}
                      <div className="md:col-span-2">
                        <Textarea label="Description" value={form.description} onChange={event => updateForm('description', event.target.value)} error={fieldErrors.description} minLength={20} maxLength={5000} required helperText="Describe what attendees can expect." />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Event banner"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleBannerImageChange}
                          helperText="JPG, PNG, or WebP; maximum file size 5 MB."
                        />
                        {bannerImageFile && (
                          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-500">
                            <span className="truncate">{bannerImageFile.name}</span>
                            <button type="button" className="shrink-0 font-semibold text-rose-700 hover:underline" onClick={() => setBannerImageFile(null)}>
                              Remove image
                            </button>
                          </div>
                        )}
                        {(bannerPreviewUrl || form.bannerImageUrl) && (
                          <img
                            src={bannerPreviewUrl || form.bannerImageUrl}
                            alt="Event banner preview"
                            className="mt-4 h-40 w-full rounded-xl object-cover"
                            onError={event => { event.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {step === 1 && (
                  <section aria-labelledby="when-where-heading">
                    <div className="mb-6">
                      <h2 id="when-where-heading" className="text-xl font-bold text-neutral-900">When &amp; where</h2>
                      <p className="mt-1 text-sm text-neutral-500">Set the event format, location, dates, and total attendee capacity.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <Select
                        label="Event type"
                        value={form.eventType}
                        onChange={event => {
                          updateForm('eventType', event.target.value as EventType);
                          setFieldErrors(current => {
                            const next = { ...current };
                            delete next.venue;
                            delete next['online-meeting-details'];
                            return next;
                          });
                        }}
                        options={[
                          { value: 'IN_PERSON', label: 'In person' },
                          { value: 'ONLINE', label: 'Online' },
                          { value: 'HYBRID', label: 'Hybrid' },
                        ]}
                      />
                      {form.eventType !== 'ONLINE' && (
                        <Input label="Venue" value={form.venue} onChange={event => updateForm('venue', event.target.value)} error={fieldErrors.venue} maxLength={250} required />
                      )}
                      {form.eventType !== 'IN_PERSON' && (
                        <div className="md:col-span-2">
                          <Textarea label="Online meeting details" value={form.meetingDetails} onChange={event => updateForm('meetingDetails', event.target.value)} error={fieldErrors['online-meeting-details']} maxLength={2000} required helperText="Add the meeting URL or access instructions." />
                        </div>
                      )}
                      {form.eventType !== 'ONLINE' && (
                        <div className="md:col-span-2">
                          <Textarea label="Directions" value={form.directions} onChange={event => updateForm('directions', event.target.value)} maxLength={2000} helperText="Add directions attendees can follow to reach the venue." />
                        </div>
                      )}
                      {form.eventType !== 'ONLINE' && (
                        <div className="md:col-span-2">
                          <Textarea label="Parking information" value={form.parkingInformation} onChange={event => updateForm('parkingInformation', event.target.value)} maxLength={2000} helperText="Share parking availability, access, or fees." />
                        </div>
                      )}
                      <Input label="Start date and time" type="datetime-local" value={form.startTime} onChange={event => updateForm('startTime', event.target.value)} error={fieldErrors['start-date-and-time']} required />
                      <Input label="End date and time" type="datetime-local" min={form.startTime} value={form.endTime} onChange={event => updateForm('endTime', event.target.value)} error={fieldErrors['end-date-and-time']} required />
                      <div className="md:col-span-2">
                        <Input
                          label="Event capacity"
                          type="number"
                          min={existingEvent ? Math.max(1, existingEvent.capacity - existingEvent.availableCapacity) : 1}
                          max={1_000_000}
                          step={1}
                          value={form.capacity}
                          error={fieldErrors['event-capacity']}
                          onChange={event => updateForm('capacity', event.target.value)}
                          helperText={`The total ticket quantities must equal capacity.${existingEvent && existingEvent.capacity !== existingEvent.availableCapacity ? ` At least ${existingEvent.capacity - existingEvent.availableCapacity} places are already booked.` : ''}`}
                          required
                        />
                      </div>
                    </div>
                  </section>
                )}

                {step === 2 && (
                  <section aria-labelledby="tickets-heading">
                    <div className="mb-6">
                      <h2 id="tickets-heading" className="text-xl font-bold text-neutral-900">Tickets</h2>
                      <p className="mt-1 text-sm text-neutral-500">Set ticket prices and allocate the full event capacity across ticket types.</p>
                    </div>
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(17rem,0.8fr)]">
                      <div>
                        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-neutral-800">
                              {form.capacity ? `${ticketQuantityTotal} of ${form.capacity} seats allocated` : `${ticketQuantityTotal} seats allocated`}
                            </span>
                            <span className="text-neutral-500">Capacity {form.capacity || '—'} (from step 2)</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label="Ticket capacity allocation"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={ticketAllocationPercent}
                            className="h-2 overflow-hidden rounded-full bg-neutral-200"
                          >
                            <div
                              className={`h-full rounded-full transition-all ${ticketQuantityTotal > capacityValue ? 'bg-rose-600' : 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400'}`}
                              style={{ width: `${ticketAllocationPercent}%` }}
                            />
                          </div>
                          {form.capacity && ticketQuantityTotal !== capacityValue && (
                            <p className="mt-2 text-xs font-medium text-rose-700">
                              Ticket quantities must total {form.capacity}.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-4">
                          {form.ticketTypes.map((ticket, index) => (
                            <article key={index} className="rounded-xl border border-neutral-200 p-4 sm:p-5">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-neutral-900">Ticket type {index + 1}</h3>
                                {form.ticketTypes.length > 1 && (
                                  <button
                                    type="button"
                                    disabled={ticket.soldQuantity > 0}
                                    className="text-xs font-semibold text-rose-700 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
                                    onClick={() => {
                                      setForm(current => ({
                                        ...current,
                                        ticketTypes: current.ticketTypes.filter((_, ticketIndex) => ticketIndex !== index),
                                      }));
                                      setFieldErrors({});
                                    }}
                                    title={ticket.soldQuantity > 0 ? 'Ticket types with bookings cannot be removed.' : undefined}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Select
                                  id={`ticket-type-${index}`}
                                  label="Ticket type"
                                  value={ticket.name}
                                  error={fieldErrors[`ticket-type-${index}`]}
                                  onChange={event => updateTicket(index, { name: event.target.value })}
                                  disabled={ticket.soldQuantity > 0}
                                  options={[
                                    ...TICKET_TYPE_OPTIONS.map(name => ({ value: name, label: name })),
                                    ...(ticket.name && !TICKET_TYPE_OPTIONS.includes(ticket.name)
                                      ? [{ value: ticket.name, label: ticket.name }]
                                      : []),
                                  ]}
                                  required
                                />
                                <div>
                                  <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Price type</span>
                                  <div role="group" aria-label={`${ticket.name} price type`} className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
                                    <button
                                      type="button"
                                      aria-pressed={ticket.isFree}
                                      onClick={() => {
                                        updateTicket(index, { isFree: true });
                                        setFieldErrors(current => {
                                          const next = { ...current };
                                          delete next[`ticket-price-${index}`];
                                          return next;
                                        });
                                      }}
                                      className={`rounded-md px-4 py-2 text-xs font-semibold ${ticket.isFree ? 'bg-white text-rose-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                                    >
                                      Free
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={!ticket.isFree}
                                      onClick={() => updateTicket(index, {
                                        isFree: false,
                                        ...(Number(ticket.price) === 0 ? { price: '' } : {}),
                                      })}
                                      className={`rounded-md px-4 py-2 text-xs font-semibold ${!ticket.isFree ? 'bg-white text-rose-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                                    >
                                      Paid
                                    </button>
                                  </div>
                                </div>
                                <Textarea id={`ticket-description-${index}`} label="Description (optional)" rows={2} value={ticket.description} onChange={event => updateTicket(index, { description: event.target.value })} maxLength={500} />
                                {!ticket.isFree && (
                                  <Input
                                    id={`ticket-price-${index}`}
                                    label="Price (ZAR)"
                                    type="number"
                                    min={0.01}
                                    max={99_999_999.99}
                                    step={0.01}
                                    value={ticket.price}
                                    error={fieldErrors[`ticket-price-${index}`]}
                                    onChange={event => updateTicket(index, { price: event.target.value })}
                                    required
                                  />
                                )}
                                <Input
                                  id={`ticket-quantity-${index}`}
                                  label="Quantity"
                                  type="number"
                                  min={Math.max(1, ticket.soldQuantity)}
                                  max={1_000_000}
                                  step={1}
                                  value={ticket.quantity}
                                  error={fieldErrors[`ticket-quantity-${index}`]}
                                  onChange={event => updateTicket(index, { quantity: event.target.value })}
                                  helperText={ticket.soldQuantity > 0 ? `${ticket.soldQuantity} places already booked; quantity cannot be lower.` : undefined}
                                  required
                                />
                              </div>
                              {ticket.soldQuantity > 0 && (
                                <p className="mt-3 text-xs text-neutral-500">
                                  This ticket type has bookings, so its name cannot be changed or removed.
                                </p>
                              )}
                            </article>
                          ))}
                        </div>
                        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={addTicketType}>
                          <PlusIcon />
                          Add ticket type
                        </Button>
                      </div>

                      <aside className="h-fit overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm" aria-label="Live event preview">
                        <div className="border-b border-neutral-100 px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Live preview</p>
                          <h3 className="mt-1 font-bold text-neutral-900">Event page</h3>
                        </div>
                        <div className="aspect-[16/8] overflow-hidden bg-gradient-to-br from-rose-600 via-orange-500 to-amber-300">
                          {(bannerPreviewUrl || form.bannerImageUrl) && (
                            <img src={bannerPreviewUrl || form.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-neutral-900">{form.title || 'Your event title'}</h4>
                          <p className="mt-1 line-clamp-3 text-xs text-neutral-500">{form.description || 'Your event description will appear here.'}</p>
                          <p className="mt-3 text-xs font-semibold text-neutral-700">
                            {form.startTime ? new Date(form.startTime).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date and time'}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">{form.venue || (form.eventType === 'ONLINE' ? 'Online event' : 'Venue')}</p>
                          <div className="mt-4 space-y-2">
                            {form.ticketTypes.map((ticket, index) => (
                              <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2 text-xs">
                                <span className="truncate font-medium text-neutral-700">{ticket.name || `Ticket ${index + 1}`}</span>
                                <span className="shrink-0 font-semibold text-neutral-900">{ticket.isFree ? 'Free' : `R ${Number(ticket.price || 0).toFixed(2)}`}</span>
                              </div>
                            ))}
                          </div>
                          <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-lg bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2.5 text-sm font-bold text-white opacity-70">
                            Booking preview only
                          </button>
                        </div>
                      </aside>
                    </div>
                  </section>
                )}

                {step === 3 && (
                  <section aria-labelledby="stands-review-heading">
                    <div className="mb-6">
                      <h2 id="stands-review-heading" className="text-xl font-bold text-neutral-900">Stands &amp; review</h2>
                      <p className="mt-1 text-sm text-neutral-500">Set the number of vendor stands and confirm the event details before saving.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div>
                        <Input
                          label="Vendor stands available"
                          type="number"
                          min={0}
                          max={1_000_000}
                          step={1}
                          value={form.vendorStandsAvailable}
                          error={fieldErrors['vendor-stands-available']}
                          onChange={event => updateForm('vendorStandsAvailable', event.target.value)}
                          helperText="Informational only; this number does not limit vendor applications."
                          required
                        />
                        <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                          Vendor applications are managed from the event’s stand requests page after it is created.
                        </div>
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-bold text-neutral-900">Review your event</h3>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">Ready to save</span>
                        </div>
                        <dl className="mt-4 divide-y divide-neutral-200 text-sm">
                          <div className="flex items-start justify-between gap-4 py-3">
                            <dt className="text-neutral-500">Event</dt>
                            <dd className="text-right font-semibold text-neutral-900">{form.title || 'Not set'} ·                             {form.category === 'other' ? form.categoryOther || 'Other' : form.category || 'No category'}</dd>
                          </div>
                          <div className="flex items-start justify-between gap-4 py-3">
                            <dt className="text-neutral-500">Date</dt>
                            <dd className="text-right font-semibold text-neutral-900">{form.startTime ? new Date(form.startTime).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}</dd>
                          </div>
                          <div className="flex items-start justify-between gap-4 py-3">
                            <dt className="text-neutral-500">Location</dt>
                            <dd className="text-right font-semibold text-neutral-900">{form.venue || (form.eventType === 'ONLINE' ? 'Online' : 'Not set')}</dd>
                          </div>
                          <div className="flex items-start justify-between gap-4 py-3">
                            <dt className="text-neutral-500">Capacity</dt>
                            <dd className="text-right font-semibold text-neutral-900">{form.capacity || 'Not set'} places · {form.vendorStandsAvailable || 0} stands</dd>
                          </div>
                          <div className="flex items-start justify-between gap-4 py-3">
                            <dt className="text-neutral-500">Tickets</dt>
                            <dd className="text-right font-semibold text-neutral-900">{form.ticketTypes.length} types · {ticketQuantityTotal} places allocated</dd>
                          </div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => { setFieldErrors({}); setStep(0); }} className="text-xs font-semibold text-brand-700 hover:underline">Edit basics</button>
                          <button type="button" onClick={() => { setFieldErrors({}); setStep(1); }} className="text-xs font-semibold text-brand-700 hover:underline">Edit date &amp; venue</button>
                          <button type="button" onClick={() => { setFieldErrors({}); setStep(2); }} className="text-xs font-semibold text-brand-700 hover:underline">Edit tickets</button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Link to="/organizer/events">
                      <Button type="button" variant="secondary">Cancel</Button>
                    </Link>
                    {step > 0 && (
                      <Button type="button" variant={isEditing ? 'ghost' : 'secondary'} onClick={goToPreviousStep}>Back</Button>
                    )}
                  </div>
                  {step < CREATE_STEPS.length - 1 ? (
                    <Button type="button" onClick={goToNextStep}>
                      Next: {CREATE_STEPS[step + 1]}
                      <span aria-hidden="true">→</span>
                    </Button>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="submit" name="action" value="draft" data-submit-action="draft" variant={isEditing ? 'outline' : 'secondary'} loading={saving}>
                        {isEditing ? 'Save changes' : 'Save draft'}
                      </Button>
                      {(!existingEvent || existingEvent.status === 'DRAFT') && (
                        <Button type="submit" name="action" value="publish" data-submit-action="publish" loading={saving}>
                          {isEditing ? 'Save and publish' : 'Save and publish event'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {reviewOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <section
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="published-event-review-title"
                      className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                      <div className="border-b border-neutral-200 px-5 py-5 sm:px-7">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">Published event</p>
                        <h2 id="published-event-review-title" className="mt-1 text-xl font-black text-neutral-900">
                          Review your changes
                        </h2>
                        <p className="mt-2 text-sm text-neutral-600">
                          These changes will be saved to the published event. The event will remain published.
                        </p>
                      </div>
                      <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5 sm:p-7">
                        {reviewChanges.map(change => (
                          <article key={change.label} className="grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
                            <h3 className="text-sm font-bold text-neutral-800">{change.label}</h3>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Before</p>
                              <p className="mt-1 whitespace-pre-line break-words text-sm text-neutral-600">{change.before || 'Not set'}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">After</p>
                              <p className="mt-1 whitespace-pre-line break-words text-sm font-medium text-neutral-900">{change.after || 'Not set'}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            reviewConfirmed.current = false;
                            setReviewOpen(false);
                          }}
                        >
                          Keep editing
                        </Button>
                        <Button
                          type="button"
                          loading={saving}
                          onClick={() => {
                            if (!formRef.current?.reportValidity()) return;
                            reviewConfirmed.current = true;
                            setReviewOpen(false);
                            formRef.current?.requestSubmit();
                          }}
                        >
                          Save changes
                        </Button>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
