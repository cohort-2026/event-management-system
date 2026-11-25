import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import OrganizerTopBar from '@/components/layout/OrganizerTopBar';
import OrganizerNotificationInbox from '@/components/layout/OrganizerNotificationInbox';
import StatCard from '@/components/app/StatCard';
import Badge from '@/components/legacy/Badge';
import Button from '@/components/legacy/Button';
import Spinner from '@/components/legacy/Spinner';
import { cancelEvent, completeEvent, getEventRegistrations, getMyEvents, publishEvent } from '@/services/eventService';
import { getEventApplications } from '@/services/vendorService';
import { getOrganizerProfile } from '@/services/organizerService';
import type { OrganizerProfile } from '@/services/organizerService';
import type { Event, EventStatus } from '@/types/event';
import type { EventRegistration } from '@/services/eventService';
import type { VendorApplication } from '@/types/vendor';
import type { BadgeVariant } from '@/components/legacy/Badge';

const statusVariant: Record<EventStatus, BadgeVariant> = {
  PUBLISHED: 'success',
  DRAFT: 'default',
  CANCELLED: 'danger',
  COMPLETED: 'info',
};

const statusLabel = (status: EventStatus): string => (
  status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
);
type EventFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'PAST' | 'CANCELLED';

const eventFilters: Array<{ value: EventFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PAST', label: 'Past' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const isPastEvent = (event: Event): boolean => (
  event.status === 'COMPLETED' ||
  (event.status === 'PUBLISHED' && new Date(event.endTime) <= new Date())
);

const formatDate = (date: string): string => new Date(date).toLocaleString('en-ZA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatEventDate = (date: string): string => new Date(date).toLocaleDateString('en-ZA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const exportEventsCsv = (events: Event[]) => {
  const columns = ['Event', 'Date', 'Venue', 'Status', 'Capacity', 'Booked places', 'Available places'];
  const escapeCell = (value: unknown) => {
    const text = String(value ?? '');
    const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const rows = events.map(event => [
    event.title,
    formatEventDate(event.startTime),
    event.venue,
    statusLabel(event.status),
    event.capacity,
    bookedPlaces(event),
    event.availableCapacity,
  ]);
  const csv = [columns, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'organizer-events.csv';
  link.click();
  URL.revokeObjectURL(url);
};

const bookedPlaces = (event: Event): number => Math.max(0, event.capacity - event.availableCapacity);

const formatRelativeTime = (date: string): string => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (!Number.isFinite(minutes)) return 'Date unavailable';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

function CalendarIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z" /></svg>;
}

function TicketIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 000-4V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} strokeDasharray="2 2" d="M12 6v12" /></svg>;
}

function ChartIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V5m0 14h17M8 15v-4m5 4V7m5 8v-6" /></svg>;
}

function StandIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10l2-5h14l2 5M4 10h16v10H4V10zm4 10v-6h8v6M3 10a2 2 0 004 0m0 0a2 2 0 004 0m0 0a2 2 0 004 0m0 0a2 2 0 004 0" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m7-7H5" /></svg>;
}

function BookingProgress({ event }: { event: Event }) {
  const booked = bookedPlaces(event);
  const progress = event.capacity > 0 ? Math.min(100, Math.round((booked / event.capacity) * 100)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-neutral-700">{booked} of {event.capacity} places booked</span>
        <span className="text-neutral-500">{progress}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Places booked for ${event.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-2 overflow-hidden rounded-full bg-neutral-200"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-[#123456] to-orange-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function EventLinks({ event }: { event: Event }) {
  const linkClass = 'organizer-action-link inline-flex min-h-9 items-center rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:border-brand-300 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link className={linkClass} to={`/organizer/events/${event.id}`} aria-label={`Open event hub for ${event.title}`}>
        Event hub
      </Link>
      <Link className={linkClass} to={`/organizer/events/${event.id}/edit`} aria-label={`Edit ${event.title}`}>
        Edit event
      </Link>
      <Link className={linkClass} to={`/organizer/events/${event.id}/registrations`} aria-label={`View registrations for ${event.title}`}>
        Guest list
      </Link>
      <Link className={linkClass} to={`/organizer/events/${event.id}/vendors`} aria-label={`Review stand requests for ${event.title}`}>
        Stand requests
      </Link>
    </div>
  );
}

function LoadingOverview() {
  return (
    <div role="status" className="dashboard-panel flex min-h-48 items-center justify-center gap-3 p-6 text-sm text-neutral-500">
      <Spinner />
      <span>Loading your organizer overview…</span>
    </div>
  );
}

function ProfileActivity() {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getOrganizerProfile()
      .then(response => {
        if (active) {
          setProfile(response.data.data);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Profile status could not be loaded.');
      });
    return () => { active = false; };
  }, [attempt]);

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm font-semibold text-[#15100e]">
        <span>{error}</span>
        <button type="button" className="font-semibold underline" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Try again</button>
      </div>
    );
  }
  if (!profile) return <p role="status" className="px-5 py-4 text-sm text-[#15100e]">Loading profile status…</p>;

  return (
    <div className="px-5 py-4">
      <p className={`font-semibold ${profile.profileApprovalStatus === 'APPROVED' ? '!text-emerald-800' : 'text-[#15100e]'}`}>
        {profile.profileApprovalStatus === 'APPROVED'
          ? 'Organization profile approved'
          : profile.profileApprovalStatus === 'REJECTED'
            ? 'Organization profile needs changes'
            : 'Organization profile awaiting approval'}
      </p>
      {profile.profileApprovalStatus === 'REJECTED' && profile.profileRejectionReason && (
        <p className="mt-1 whitespace-pre-line text-sm text-[#15100e]">{profile.profileRejectionReason}</p>
      )}
      <Link to="/organizer/profile" className="mt-2 inline-block text-sm font-semibold text-[#15100e] underline underline-offset-4">View profile</Link>
    </div>
  );
}

export default function OrganizerDashboard() {
  const pathname = useLocation().pathname;
  const isMyEventsPage = pathname === '/organizer/events';
  const isNotificationsPage = pathname === '/organizer/notifications';
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [completedReportEventId, setCompletedReportEventId] = useState<string | null>(null);
  const [standRequests, setStandRequests] = useState<VendorApplication[]>([]);
  const [standRequestsLoading, setStandRequestsLoading] = useState(true);
  const [standRequestsError, setStandRequestsError] = useState('');
  const [recentBookings, setRecentBookings] = useState<Array<EventRegistration & { eventId: string; eventTitle: string }>>([]);
  const [bookingsThisMonth, setBookingsThisMonth] = useState(0);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('ALL');
  const eventSearch = searchParams.get('search') ?? '';
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationEventId, setCancellationEventId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const setEventSearch = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('search', value);
    else nextParams.delete('search');
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setStandRequestsLoading(!isMyEventsPage);
    setStandRequestsError('');
    setBookingsLoading(!isMyEventsPage);
    setBookingsError('');
    setStandRequests([]);
    setRecentBookings([]);
    setBookingsThisMonth(0);
    getMyEvents()
      .then(async response => {
        const loadedEvents = response.data.data;
        if (!active) return;
        setEvents(loadedEvents);
        setLoading(false);
        if (isMyEventsPage) {
          setStandRequestsLoading(false);
          setBookingsLoading(false);
          return;
        }

        const [requestResults, bookingResults] = await Promise.all([
          Promise.allSettled(loadedEvents.map(event => getEventApplications(event.id))),
          Promise.allSettled(loadedEvents.map(event => getEventRegistrations(event.id))),
        ]);
        if (!active) return;

        const loadedRequests: VendorApplication[] = [];
        let failedRequestLoads = 0;
        requestResults.forEach(result => {
          if (result.status === 'fulfilled') {
            loadedRequests.push(...result.value.data.data);
          } else {
            failedRequestLoads += 1;
          }
        });
        setStandRequests(loadedRequests);
        setStandRequestsError(failedRequestLoads > 0
          ? `Stand requests could not be loaded for ${failedRequestLoads} ${failedRequestLoads === 1 ? 'event' : 'events'}.`
          : '');
        setStandRequestsLoading(false);

        const loadedBookings: Array<EventRegistration & { eventId: string; eventTitle: string }> = [];
        let failedBookingLoads = 0;
        bookingResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            loadedBookings.push(...result.value.data.data.map(booking => ({
              ...booking,
              eventId: loadedEvents[index].id,
              eventTitle: loadedEvents[index].title,
            })));
          } else {
            failedBookingLoads += 1;
          }
        });
        setRecentBookings(
          loadedBookings
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4),
        );
        const thisMonth = new Date();
        setBookingsThisMonth(loadedBookings.filter(booking => {
          const createdAt = new Date(booking.createdAt);
          return createdAt.getFullYear() === thisMonth.getFullYear() &&
            createdAt.getMonth() === thisMonth.getMonth();
        }).length);
        setBookingsError(failedBookingLoads > 0
          ? `Recent bookings could not be loaded for ${failedBookingLoads} ${failedBookingLoads === 1 ? 'event' : 'events'}.`
          : '');
        setBookingsLoading(false);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Your events could not be loaded.')
            : 'Your events could not be loaded.');
          setStandRequests([]);
          setStandRequestsLoading(false);
          setStandRequestsError('');
          setRecentBookings([]);
          setBookingsThisMonth(0);
          setBookingsLoading(false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isMyEventsPage, reloadKey]);

  const refreshEvents = async () => {
    setReloadKey(key => key + 1);
  };

  const retryLoad = () => {
    setLoading(true);
    setError('');
    setReloadKey(key => key + 1);
  };

  const publish = async (eventId: string) => {
    setError('');
    setNotice('');
    setCompletedReportEventId(null);
    setSubmittingId(eventId);
    try {
      const response = await publishEvent(eventId);
      setNotice(response.data.message ?? 'Event published.');
      await refreshEvents();
    } catch (publishError) {
      setError(axios.isAxiosError(publishError)
        ? (publishError.response?.data?.message ?? 'Event could not be published.')
        : 'Event could not be published.');
    } finally {
      setSubmittingId(null);
    }
  };

  const cancel = async (event: Event) => {
    const reason = cancellationReason.trim();
    if (!reason) {
      setError('Enter a reason before cancelling the event.');
      return;
    }

    setError('');
    setNotice('');
    setCompletedReportEventId(null);
    setCancellingId(event.id);
    try {
      const response = await cancelEvent(event.id, reason);
      setNotice(response.data.message ?? 'Event cancelled.');
      await refreshEvents();
      setCancellationEventId(null);
      setCancellationReason('');
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
    setCompletedReportEventId(null);
    setCompletingId(event.id);
    try {
      const response = await completeEvent(event.id);
      setNotice(response.data.message ?? 'Event marked as completed. Your final report is ready.');
      setCompletedReportEventId(event.id);
      await refreshEvents();
    } catch (completeError) {
      setError(axios.isAxiosError(completeError)
        ? (completeError.response?.data?.message ?? 'Event could not be completed.')
        : 'Event could not be completed.');
    } finally {
      setCompletingId(null);
    }
  };

  const now = new Date();
  const upcomingEvents = events
    .filter(event => new Date(event.startTime) > now && event.status !== 'CANCELLED' && event.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const pendingRequests = standRequests.filter(application => application.status === 'PENDING_REVIEW');
  const pendingRequestsByEvent = events
    .map(event => {
      const applications = pendingRequests
        .filter(application => application.eventId === event.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return { event, applications };
    })
    .filter(group => group.applications.length > 0)
    .sort((a, b) => new Date(a.applications[0].createdAt).getTime() - new Date(b.applications[0].createdAt).getTime());
  const attentionEvents = events
    .filter(event => event.status === 'DRAFT' || (event.status === 'PUBLISHED' && new Date(event.endTime) <= now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const nextEvent = upcomingEvents[0];
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
  const totalBookedPlaces = events.reduce((total, event) => total + bookedPlaces(event), 0);
  const totalCapacity = events.reduce((total, event) => total + event.capacity, 0);
  const averageCapacityFilled = totalCapacity > 0 ? Math.round((totalBookedPlaces / totalCapacity) * 100) : 0;
  const daysUntilNextEvent = nextEvent
    ? Math.max(0, Math.ceil((new Date(nextEvent.startTime).getTime() - now.getTime()) / 86_400_000))
    : null;
  const nextEventDateLabel = daysUntilNextEvent === 0
    ? 'Today'
    : daysUntilNextEvent === 1
      ? 'Tomorrow'
      : `In ${daysUntilNextEvent} days`;
  const attentionCount = pendingRequestsByEvent.length + attentionEvents.length;
  const matchingEvents = events.filter(event => {
    const matchesFilter = eventFilter === 'ALL' ||
      event.status === eventFilter ||
      (eventFilter === 'PAST' && isPastEvent(event));
    const search = eventSearch.trim().toLowerCase();
    const matchesSearch = !search ||
      `${event.title} ${event.venue} ${event.category}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });
  const eventFilterCounts: Record<EventFilter, number> = {
    ALL: events.length,
    DRAFT: events.filter(event => event.status === 'DRAFT').length,
    PUBLISHED: events.filter(event => event.status === 'PUBLISHED').length,
    PAST: events.filter(isPastEvent).length,
    CANCELLED: events.filter(event => event.status === 'CANCELLED').length,
  };

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />

        <section className="min-w-0 flex-1 p-4 sm:p-6">
          {isNotificationsPage ? (
            <DashboardHeader
              title="Notifications"
              topBarSubtitle="Activity and items needing attention across your organization."
              showNavigation={false}
            />
          ) : isMyEventsPage ? (
            <DashboardHeader
              title="My events"
              topBarSubtitle="Create, publish, and manage your events."
              showNavigation={false}
              appearance="analytics"
            />
          ) : (
            <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 bg-white shadow-sm sm:-mx-6 sm:-mt-6">
              <OrganizerTopBar title="Overview" showTitle={false} heading="Overview" compactHeading onSearch={() => setEventFilter('ALL')} />
              <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Organizer</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">Overview</h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    Good {greeting}, {user?.firstname || 'there'}{user?.organizationName ? ` · ${user.organizationName}` : ' — here is the latest activity across your events.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="secondary" disabled={events.length === 0} onClick={() => exportEventsCsv(events)}>
                    Export
                  </Button>
                  <Link to="/organizer/events/new" className="organizer-create-button inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <span aria-hidden="true" className="text-base leading-none">+</span>
                    Create event
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={retryLoad}>Try again</Button>
            </div>
          )}
          {notice && (
            <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm !text-emerald-800">
              <span>{notice}</span>
              {completedReportEventId && (
                <Link to={`/organizer/reports/events/${completedReportEventId}`} className="shrink-0 font-semibold underline underline-offset-2">
                  View final report
                </Link>
              )}
            </div>
          )}

          {isNotificationsPage && (
            <div className="space-y-5">
              <OrganizerNotificationInbox />
              <section className="organizer-notification-card overflow-hidden rounded-xl border border-black/20 text-[#15100e] shadow-sm" aria-labelledby="profile-activity-heading">
                <h2 id="profile-activity-heading" className="border-b border-black/20 px-5 py-4 font-bold text-[#15100e]">Organization status</h2>
                <ProfileActivity />
              </section>
              <section className="organizer-notification-card overflow-hidden rounded-xl border border-black/20 text-[#15100e] shadow-sm" aria-labelledby="event-activity-heading">
                <h2 id="event-activity-heading" className="border-b border-black/20 px-5 py-4 font-bold text-[#15100e]">Needs attention</h2>
                {loading || standRequestsLoading ? (
                  <p role="status" className="px-5 py-4 text-sm text-[#15100e]">Loading event activity…</p>
                ) : (
                  <>
                    {standRequestsError && <p role="alert" className="px-5 py-4 text-sm font-semibold text-[#15100e]">{standRequestsError}</p>}
                    <ul className="divide-y divide-black/20">
                      {pendingRequestsByEvent.map(({ event, applications }) => (
                        <li key={`requests-${event.id}`} className="px-5 py-4">
                          <p className="font-semibold text-[#15100e]">{applications.length} pending stand {applications.length === 1 ? 'request' : 'requests'} for {event.title}</p>
                          <Link to={`/organizer/events/${event.id}/vendors`} className="mt-2 inline-block text-sm font-semibold text-[#15100e] underline underline-offset-4">Review requests</Link>
                        </li>
                      ))}
                      {attentionEvents.map(event => (
                        <li key={event.id} className="px-5 py-4">
                          <p className="font-semibold text-[#15100e]">{event.title}</p>
                          <p className="mt-1 text-sm text-[#15100e]">{event.status === 'DRAFT' ? 'This event is a draft.' : `This event ended ${formatDate(event.endTime)}.`}</p>
                          <Link to={`/organizer/events/${event.id}`} className="mt-2 inline-block text-sm font-semibold text-[#15100e] underline underline-offset-4">View event</Link>
                        </li>
                      ))}
                    </ul>
                    {!error && !standRequestsError && pendingRequestsByEvent.length === 0 && attentionEvents.length === 0 && (
                      <p className="px-5 py-4 text-sm text-[#15100e]">No event actions need your attention.</p>
                    )}
                  </>
                )}
              </section>
              <section className="organizer-notification-card overflow-hidden rounded-xl border border-black/20 text-[#15100e] shadow-sm" aria-labelledby="booking-activity-heading">
                <div className="border-b border-black/20 px-5 py-4">
                  <h2 id="booking-activity-heading" className="font-bold text-[#15100e]">Recent bookings</h2>
                  <p className="mt-1 text-xs text-[#15100e]">Up to four recent registrations.</p>
                </div>
                {loading || bookingsLoading ? (
                  <p role="status" className="px-5 py-4 text-sm text-[#15100e]">Loading bookings…</p>
                ) : (
                  <>
                    {bookingsError && <p role="alert" className="px-5 py-4 text-sm font-semibold text-[#15100e]">{bookingsError}</p>}
                    <ul className="divide-y divide-black/20">
                      {recentBookings.map(booking => (
                        <li key={booking.id} className="px-5 py-4">
                          <p className="text-sm text-[#15100e]"><span className="font-semibold">{booking.attendee.firstname} {booking.attendee.lastname}</span> registered for {booking.eventTitle}</p>
                          <p className="mt-1 text-xs text-[#15100e]">{formatRelativeTime(booking.createdAt)}</p>
                          <Link to={`/organizer/events/${booking.eventId}/registrations`} className="mt-2 inline-block text-sm font-semibold text-[#15100e] underline underline-offset-4">View registrations</Link>
                        </li>
                      ))}
                    </ul>
                    {!error && !bookingsError && recentBookings.length === 0 && <p className="px-5 py-4 text-sm text-[#15100e]">No recent bookings.</p>}
                  </>
                )}
              </section>
            </div>
          )}

          {!isMyEventsPage && !isNotificationsPage && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                      label="Upcoming events"
                      value={loading ? '—' : upcomingEvents.length}
                      sub="Not cancelled or completed"
                      icon={<CalendarIcon />}
                      color="brand"
                />
                <StatCard
                      label="Bookings this month"
                      value={bookingsLoading || bookingsError ? '—' : bookingsThisMonth}
                      sub={bookingsError ? 'Could not load booking totals' : 'New registrations'}
                      icon={<TicketIcon />}
                  color="emerald"
                />
                <StatCard
                      label="Average capacity filled"
                      value={loading || totalCapacity === 0 ? '—' : `${averageCapacityFilled}%`}
                      sub="Booked places across your events"
                      icon={<ChartIcon />}
                  color="amber"
                />
                <StatCard
                      label="Stand requests"
                      value={standRequestsLoading || standRequestsError ? '—' : pendingRequests.length}
                      sub={standRequestsError ? 'Could not load request statuses' : 'Awaiting your review'}
                      icon={<StandIcon />}
                  color="purple"
                />
              </div>

              {loading ? (
                <LoadingOverview />
              ) : events.length === 0 && error ? (
                <div className="dashboard-panel p-8 text-center">
                  <h2 className="text-lg font-bold text-neutral-900">Your events are unavailable</h2>
                  <p className="mt-2 text-sm text-neutral-500">Try loading your events again, or create an event once the connection is restored.</p>
                </div>
              ) : events.length === 0 ? (
                <div className="dashboard-panel p-8 text-center sm:p-12">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">▦</div>
                  <h2 className="mt-4 text-lg font-bold text-neutral-900">No events yet</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">Create your first event to start tracking dates, publishing status, and bookings here.</p>
                  <Link to="/organizer/events/new" className="mt-5 inline-flex">
                    <Button size="sm">Create your first event</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
                    <section className="dashboard-panel p-5 sm:p-6" aria-labelledby="next-event-heading">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">Coming up</p>
                          <h2 id="next-event-heading" className="mt-1 text-lg font-bold text-neutral-900">Next event</h2>
                        </div>
                        <Link to="/organizer/events" className="text-xs font-semibold text-brand-700 underline-offset-4 hover:underline">
                          All events
                        </Link>
                      </div>

                      {nextEvent ? (
                        <article className="overflow-hidden rounded-xl border border-neutral-200">
                          <div className="grid sm:grid-cols-[8rem_minmax(0,1fr)]">
                            <div className="relative min-h-36 overflow-hidden bg-gradient-to-br from-[#123456] via-[#1e4970] to-orange-500 sm:min-h-full">
                              {nextEvent.bannerImageUrl && (
                                <img src={nextEvent.bannerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-br from-[#123456]/35 to-orange-500/25" />
                              <div className="absolute left-4 top-4 rounded-xl bg-white px-3 py-2 text-center shadow-md">
                                <span className="block text-[10px] font-bold uppercase text-orange-700">
                                  {new Date(nextEvent.startTime).toLocaleDateString('en-ZA', { month: 'short' })}
                                </span>
                                <time dateTime={nextEvent.startTime} className="block text-2xl font-black leading-none text-slate-900">
                                  {new Date(nextEvent.startTime).toLocaleDateString('en-ZA', { day: '2-digit' })}
                                </time>
                              </div>
                              <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/65 px-2.5 py-1 text-[11px] font-bold text-white">
                                {nextEventDateLabel}
                              </span>
                            </div>
                            <div className="min-w-0 p-5 sm:p-6">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={statusVariant[nextEvent.status]}>{statusLabel(nextEvent.status)}</Badge>
                                <span className="text-xs text-neutral-500">{nextEvent.category}</span>
                              </div>
                              <h3 className="mt-3 text-xl font-bold leading-tight text-neutral-900">
                                <Link
                                  to={nextEvent.status === 'PUBLISHED' ? `/events/${nextEvent.id}` : `/organizer/events/${nextEvent.id}/edit`}
                                  className="rounded-sm underline-offset-4 hover:text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                >
                                  {nextEvent.title}
                                </Link>
                              </h3>
                              <p className="mt-2 text-sm font-semibold text-neutral-700">{formatDate(nextEvent.startTime)}</p>
                              <p className="mt-1 text-sm text-neutral-500">{nextEvent.venue} · {nextEvent.eventType.replace('_', ' ')}</p>
                              <div className="mt-5">
                                <BookingProgress event={nextEvent} />
                              </div>
                              <div className="mt-5 border-t border-neutral-100 pt-4">
                                <EventLinks event={nextEvent} />
                              </div>
                            </div>
                          </div>
                        </article>
                      ) : (
                        <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-8 text-center">
                          <p className="font-semibold text-neutral-800">Nothing coming up yet</p>
                          <p className="mt-1 text-sm text-neutral-500">Create or publish an event and it will appear here.</p>
                          <Link to="/organizer/events/new" className="mt-4 inline-flex">
                            <Button size="sm">Create event</Button>
                          </Link>
                        </div>
                      )}
                    </section>

                    <section className="dashboard-panel p-5 sm:p-6" aria-labelledby="attention-heading">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Next steps</p>
                          <h2 id="attention-heading" className="mt-1 text-lg font-bold text-neutral-900">Needs your attention</h2>
                        </div>
                        {!loading && !standRequestsLoading && !standRequestsError && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{attentionCount}</span>
                        )}
                      </div>

                      {standRequestsLoading ? (
                        <div role="status" className="flex items-center gap-2 rounded-xl bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                          <Spinner /> Loading stand requests…
                        </div>
                      ) : (
                        <>
                          {standRequestsError && (
                            <p role="status" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                              {standRequestsError} You can still review each event’s requests from My events.
                            </p>
                          )}
                          <ul className="space-y-3">
                          {pendingRequestsByEvent.slice(0, 3).map(({ event, applications }) => (
                            <li key={`requests-${event.id}`} className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 text-amber-700" aria-hidden="true"><StandIcon /></span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-neutral-900">
                                    {applications.length} stand {applications.length === 1 ? 'request' : 'requests'} · {event.title}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-600">
                                    Oldest request {formatRelativeTime(applications[0].createdAt)}
                                  </p>
                                  <Link
                                    to={`/organizer/events/${event.id}/vendors`}
                                    className="mt-3 inline-flex text-xs font-bold text-brand-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                  >
                                    Review requests
                                  </Link>
                                </div>
                              </div>
                            </li>
                          ))}
                          {attentionEvents.slice(0, 4).map(event => (
                            <li key={event.id} className="rounded-xl border border-neutral-200 bg-white/70 p-4">
                              <div className="flex items-start gap-3">
                                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${event.status === 'DRAFT' ? 'bg-amber-500' : 'bg-sky-500'}`} aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-neutral-900">{event.title}</p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    {event.status === 'DRAFT' ? 'Draft · ready to publish' : `Ended ${formatDate(event.endTime)}`}
                                  </p>
                                  <div className="mt-3 flex flex-wrap items-center gap-3">
                                    {event.status === 'DRAFT' ? (
                                      <>
                                        <Link className="text-xs font-semibold text-brand-700 underline-offset-4 hover:underline" to={`/organizer/events/${event.id}/edit`}>
                                          Edit draft
                                        </Link>
                                        <Button size="sm" loading={submittingId === event.id} onClick={() => void publish(event.id)}>
                                          Publish
                                        </Button>
                                      </>
                                    ) : (
                                      <Button size="sm" loading={completingId === event.id} onClick={() => void complete(event)}>
                                        Mark complete
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                          </ul>
                          {pendingRequestsByEvent.length === 0 && attentionEvents.length === 0 && !standRequestsError && (
                            <div className="rounded-xl bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
                              <p className="font-semibold">You’re all caught up</p>
                              <p className="mt-1 text-emerald-700">No stand requests or event actions are waiting for you.</p>
                            </div>
                          )}
                        </>
                      )}
                      {attentionEvents.length > 4 && (
                        <Link to="/organizer/events" className="mt-4 inline-flex text-xs font-semibold text-brand-700 underline-offset-4 hover:underline">
                          View all {attentionEvents.length} items
                        </Link>
                      )}
                    </section>
                  </div>

                  <section className="dashboard-panel mt-5 overflow-hidden" aria-labelledby="recent-bookings-heading">
                    <div className="flex flex-col gap-1 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 id="recent-bookings-heading" className="font-bold text-neutral-900">Latest bookings</h2>
                        <p className="mt-1 text-xs text-neutral-500">Recent registrations across your events.</p>
                      </div>
                      <Link to="/organizer/events" className="text-xs font-semibold text-brand-700 underline-offset-4 hover:underline">
                        View all events
                      </Link>
                    </div>
                    {bookingsLoading ? (
                      <div role="status" className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-neutral-500">
                        <Spinner /> Loading recent bookings…
                      </div>
                    ) : bookingsError ? (
                      <p role="alert" className="px-5 py-6 text-sm text-amber-800">{bookingsError}</p>
                    ) : recentBookings.length === 0 ? (
                      <div className="px-5 py-8 text-sm text-neutral-500">
                        No bookings yet. New attendee registrations will appear here.
                      </div>
                    ) : (
                      <ul className="divide-y divide-neutral-100 sm:grid sm:grid-cols-2 sm:divide-y-0">
                        {recentBookings.map(booking => {
                          const initials = `${booking.attendee.firstname.charAt(0)}${booking.attendee.lastname.charAt(0)}`;
                          return (
                            <li key={booking.id} className="flex min-w-0 items-center gap-3 px-5 py-4">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700" aria-hidden="true">
                                {initials}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-neutral-700">
                                  <span className="font-semibold text-neutral-900">{booking.attendee.firstname} {booking.attendee.lastname}</span>
                                  {' booked '}
                                  <span>{booking.ticket?.type ?? 'a ticket'}</span>
                                </p>
                                <p className="truncate text-xs text-neutral-500">{booking.eventTitle} · {formatRelativeTime(booking.createdAt)}</p>
                              </div>
                              <Link
                                to={`/organizer/events/${booking.eventId}/registrations`}
                                className="shrink-0 text-xs font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                aria-label={`View ${booking.attendee.firstname} ${booking.attendee.lastname}'s event registrations`}
                              >
                                View
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </>
          )}

          {isMyEventsPage && (
            <section className="organizer-events-card overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm" aria-labelledby="my-events-heading">
              <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="my-events-heading" className="sr-only">My events</h2>
                <label className="relative block w-full sm:max-w-xs">
                  <span className="sr-only">Search events by name, venue, or category</span>
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" strokeWidth="2" />
                    <path d="m16 16 4 4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    value={eventSearch}
                    onChange={event => setEventSearch(event.target.value)}
                    placeholder="Search events"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <Link to="/organizer/events/new" className="organizer-create-button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm">
                  <PlusIcon />
                  Create event
                </Link>
              </div>

              <div role="group" aria-label="Filter events by status" className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 pt-3">
                {eventFilters.map(filter => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={eventFilter === filter.value}
                    onClick={() => setEventFilter(filter.value)}
                    className={`shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                      eventFilter === filter.value
                        ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : 'border-transparent text-neutral-700'
                    }`}
                  >
                    {filter.label}
                    <span className="ml-1.5">
                      {eventFilterCounts[filter.value]}
                    </span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div role="status" className="flex justify-center py-12"><Spinner /></div>
              ) : events.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="font-semibold text-neutral-900">{error ? 'Events could not be displayed' : 'No events yet'}</p>
                  <p className="mt-1 text-sm text-neutral-600">{error ? 'Try again after the connection is restored.' : 'Create your first event to get started.'}</p>
                  {!error && <Link to="/organizer/events/new" className="mt-4 inline-flex"><Button size="sm">Create your first event</Button></Link>}
                </div>
              ) : matchingEvents.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="font-semibold text-neutral-900">No events match this search</p>
                  <p className="mt-1 text-sm text-neutral-600">Try another search or choose a different status.</p>
                  <button
                    type="button"
                    onClick={() => { setEventSearch(''); setEventFilter('ALL'); }}
                    className="mt-3 text-sm font-semibold text-brand-700 underline underline-offset-4"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <p className="px-5 py-3 text-xs text-neutral-600" aria-live="polite">
                    Showing {matchingEvents.length} of {events.length} events
                  </p>
                  <div id="organizer-events-table" className="overflow-x-auto">
                    <table className="min-w-[850px] w-full text-left text-sm">
                      <thead className="border-y border-neutral-200 text-[11px] font-bold uppercase tracking-wide text-neutral-700">
                        <tr>
                          <th scope="col" className="px-5 py-3">Event</th>
                          <th scope="col" className="px-4 py-3">Status</th>
                          <th scope="col" className="px-4 py-3">Bookings</th>
                          <th scope="col" className="px-4 py-3">Stands</th>
                          <th scope="col" className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {matchingEvents.map(event => {
                          const booked = bookedPlaces(event);
                          const allocatedStands = Math.max(0, event.vendorStandsAvailable - event.availableVendorStands);
                          const past = isPastEvent(event);
                          const eventHref = `/organizer/events/${event.id}`;
                          return (
                            <tr key={event.id} className="align-middle transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex min-w-64 items-center gap-3">
                                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-rose-500 to-orange-400">
                                    {event.bannerImageUrl ? (
                                      <img src={event.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-white"><CalendarIcon /></div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <Link to={eventHref} className="block truncate font-semibold text-neutral-900 hover:underline">
                                      {event.title}
                                    </Link>
                                    <p className="mt-0.5 truncate text-xs text-neutral-600">
                                      {formatEventDate(event.startTime)} · {event.venue}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={statusVariant[event.status]}>{statusLabel(event.status)}</Badge>
                              </td>
                              <td className="px-4 py-3">
                                {event.status === 'DRAFT' ? (
                                  <span className="text-xs text-neutral-600">Not open yet</span>
                                ) : (
                                  <div className="w-28">
                                    <p className="whitespace-nowrap text-xs font-semibold text-neutral-900">{booked} / {event.capacity}</p>
                                    <div
                                      role="progressbar"
                                      aria-label={`Places booked for ${event.title}`}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={event.capacity > 0 ? Math.min(100, Math.round((booked / event.capacity) * 100)) : 0}
                                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200"
                                    >
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                                        style={{ width: `${event.capacity > 0 ? Math.min(100, (booked / event.capacity) * 100) : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {event.vendorStandsAvailable > 0 ? (
                                  <Link to={`/organizer/events/${event.id}/vendors`} className="whitespace-nowrap text-xs font-semibold text-neutral-900 hover:underline">
                                    {allocatedStands} / {event.vendorStandsAvailable}
                                  </Link>
                                ) : <span className="text-neutral-600">—</span>}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex min-w-56 flex-wrap justify-end gap-2">
                                  {event.status === 'DRAFT' ? (
                                    <>
                                      <Link to={`/organizer/events/${event.id}`}>
                                        <Button variant="secondary" size="sm">Event hub</Button>
                                      </Link>
                                      <Link to={`/organizer/events/${event.id}/edit`}>
                                        <Button variant="secondary" size="sm">Edit</Button>
                                      </Link>
                                      <Button size="sm" loading={submittingId === event.id} onClick={() => void publish(event.id)}>
                                        Publish
                                      </Button>
                                    </>
                                  ) : event.status === 'PUBLISHED' ? (
                                    <>
                                      <Link to={`/organizer/events/${event.id}`}>
                                        <Button variant="secondary" size="sm">Event hub</Button>
                                      </Link>
                                      <Link to={`/organizer/events/${event.id}/edit`}>
                                        <Button variant="secondary" size="sm">Edit</Button>
                                      </Link>
                                      {past && <Button size="sm" loading={completingId === event.id} onClick={() => void complete(event)}>Complete</Button>}
                                      <Button variant="danger" size="sm" loading={cancellingId === event.id} onClick={() => { setCancellationEventId(event.id); setCancellationReason(''); }}>Cancel</Button>
                                    </>
                                  ) : (
                                    <Link to={`/events/${event.id}`}>
                                      <Button variant="secondary" size="sm">View</Button>
                                    </Link>
                                  )}
                                  <div className="flex w-full justify-end gap-3">
                                    <Link to={`/organizer/events/${event.id}/registrations`} className="text-xs font-semibold text-brand-700 underline underline-offset-4">
                                      Guest list
                                    </Link>
                                    <Link to={`/organizer/events/${event.id}/vendors`} className="text-xs font-semibold text-brand-700 underline underline-offset-4">
                                      Stand requests
                                    </Link>
                                  </div>
                                </div>
                                {cancellationEventId === event.id && (
                                  <form className="mt-4 rounded-lg border border-rose-200 bg-rose-50/50 p-4" onSubmit={submitEvent => { submitEvent.preventDefault(); void cancel(event); }}>
                                    <label htmlFor={`cancellation-reason-${event.id}`} className="block text-sm font-semibold text-neutral-900">Reason for cancellation</label>
                                    <p id={`cancellation-reason-help-${event.id}`} className="mt-1 text-xs text-neutral-600">This reason will be included in the cancellation email to registered attendees and approved vendors.</p>
                                    <textarea
                                      id={`cancellation-reason-${event.id}`}
                                      aria-describedby={`cancellation-reason-help-${event.id}`}
                                      required
                                      maxLength={500}
                                      rows={3}
                                      value={cancellationReason}
                                      onChange={changeEvent => setCancellationReason(changeEvent.target.value)}
                                      placeholder="Explain why this event is being cancelled"
                                      className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                      <span className="text-xs text-neutral-500">{cancellationReason.length}/500</span>
                                      <div className="flex gap-2">
                                        <Button type="button" variant="secondary" size="sm" onClick={() => { setCancellationEventId(null); setCancellationReason(''); }}>Keep event</Button>
                                        <Button type="submit" variant="danger" size="sm" loading={cancellingId === event.id} disabled={!cancellationReason.trim()}>Confirm cancellation</Button>
                                      </div>
                                    </div>
                                  </form>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
