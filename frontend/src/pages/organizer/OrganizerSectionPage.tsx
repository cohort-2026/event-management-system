import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CircleHelp,
  Download,
  FileText,
  Search,
  Ticket,
} from 'lucide-react';
import OrganizerPageLayout from '@/components/organizer/OrganizerPageLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getMyEvents } from '@/services/eventService';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notificationService';
import type { Event } from '@/types/event';

export type OrganizerSection = 'attendees' | 'bookings' | 'tickets' | 'reports' | 'notifications' | 'help';

interface OrganizerSectionPageProps {
  section: OrganizerSection;
}

interface SectionConfig {
  title: string;
  description: string;
}

const sectionConfig: Record<OrganizerSection, SectionConfig> = {
  attendees: {
    title: 'Event attendees',
    description: 'Choose an event to view attendee information.',
  },
  bookings: {
    title: 'Bookings & reservations',
    description: 'Choose an event to manage reservations.',
  },
  tickets: {
    title: 'Ticket management',
    description: 'Choose an event to access its check-in tools.',
  },
  reports: {
    title: 'Reports',
    description: 'Explore the event analytics currently available to your account.',
  },
  notifications: {
    title: 'Notifications',
    description: 'Updates and activity related to your organizer account.',
  },
  help: {
    title: 'Help & support',
    description: 'Find the available support and account resources.',
  },
};

export default function OrganizerSectionPage({ section }: OrganizerSectionPageProps) {
  const config = sectionConfig[section];
  const [events, setEvents] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const loadSectionData = async () => {
      try {
        if (section === 'notifications') {
          const response = await getNotifications();
          if (active) {
            setNotifications(response.data.data);
            setUnreadCount(response.data.unreadCount);
          }
        } else if (['attendees', 'bookings', 'tickets', 'reports'].includes(section)) {
          const response = await getMyEvents();
          if (active) setEvents(response.data.data);
        }
      } catch (loadError) {
        if (active) {
          setError(axios.isAxiosError<{ message?: string }>(loadError)
            ? loadError.response?.data?.message ?? 'This information could not be loaded.'
            : 'This information could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSectionData();
    return () => { active = false; };
  }, [section]);

  const markAllRead = async () => {
    setBusy(true);
    setError('');
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications(current => current.map(notification => ({ ...notification, readAt })));
      setUnreadCount(0);
    } catch {
      setError('Notifications could not be marked as read.');
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification.id);
        setNotifications(current => current.map(item =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ));
        setUnreadCount(count => Math.max(0, count - 1));
      } catch {
        setError('This notification could not be marked as read.');
        return;
      }
    }
    navigate(notification.link);
  };

  const visibleEvents = events.filter(event =>
    [event.title, event.venue, event.category].some(value =>
      value.toLocaleLowerCase().includes(eventSearch.trim().toLocaleLowerCase()),
    ),
  );
  const needsEvents = ['attendees', 'bookings', 'tickets'].includes(section);

  const exportEventReport = () => {
    const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ['Event', 'Start date', 'Venue', 'Status', 'Capacity', 'Registered places', 'Available places'],
      ...events.map(event => [
        event.title,
        new Date(event.startTime).toLocaleString(),
        event.venue,
        event.status,
        event.capacity,
        Math.max(0, event.capacity - event.availableCapacity),
        Math.max(0, event.availableCapacity),
      ]),
    ];
    const csv = rows.map(row => row.map(escapeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'organizer-event-summary.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <OrganizerPageLayout
      title={config.title}
      subtitle={config.description}
      breadcrumbs={[{ label: config.title }]}
    >

          {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          {loading ? (
            <div className="flex justify-center rounded-2xl border border-neutral-200 bg-white py-16"><Spinner /></div>
          ) : section === 'notifications' ? (
            <section className="dashboard-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-neutral-900">Your notifications</h2>
                  <p className="mt-1 text-xs text-neutral-500">{unreadCount} unread</p>
                </div>
                {unreadCount > 0 && (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => void markAllRead()}>
                    {busy ? 'Updating…' : 'Mark all as read'}
                  </Button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-neutral-500">You’re all caught up.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {notifications.map(notification => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-neutral-50 ${notification.readAt ? '' : 'bg-violet-50/50'}`}
                      >
                        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-violet-600'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-neutral-900">{notification.title}</span>
                            {!notification.readAt && <Badge variant="purple">New</Badge>}
                          </span>
                          <span className="mt-1 block text-sm text-neutral-600">{notification.message}</span>
                          <span className="mt-1 block text-xs text-neutral-400">{new Date(notification.createdAt).toLocaleString()}</span>
                        </span>
                        <ArrowRight size={16} className="mt-1 shrink-0 text-neutral-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : section === 'reports' ? (
            <section className="dashboard-panel p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <FileText size={28} className="text-violet-600" />
                  <h2 className="mt-4 font-semibold text-neutral-900">Event performance summary</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">
                    Export event status, date, venue, capacity, and current registered-place totals. Booking history and revenue reports are not exposed by the current API.
                  </p>
                </div>
                <Button variant="secondary" onClick={exportEventReport} disabled={events.length === 0}>
                  <Download size={16} /> Export CSV
                </Button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <SummaryMetric label="Events" value={events.length} />
                <SummaryMetric label="Published" value={events.filter(event => event.status === 'PUBLISHED').length} />
                <SummaryMetric label="Registered places" value={events.reduce((sum, event) => sum + Math.max(0, event.capacity - event.availableCapacity), 0)} />
              </div>
            </section>
          ) : section === 'help' ? (
            <section className="dashboard-panel p-6 sm:p-8">
              <CircleHelp size={28} className="text-violet-600" />
              <h2 className="mt-4 font-semibold text-neutral-900">Organizer support</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">
                For account and organization details, visit your profile settings. Event feedback and approval decisions are available from the event list.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/organizer/settings"><Button variant="secondary">Profile settings</Button></Link>
                <Link to="/organizer/events"><Button>View my events</Button></Link>
              </div>
            </section>
          ) : needsEvents ? (
            <section className="dashboard-panel overflow-hidden">
              <div className="border-b border-neutral-100 px-5 py-4">
                <h2 className="font-semibold text-neutral-900">Select an event</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {section === 'tickets'
                    ? 'Review ticket tiers, sales and remaining capacity for each event.'
                    : 'Choose an event to review its registered places.'}
                </p>
              </div>
              {events.length > 0 && (
                <label className="relative block border-b border-neutral-100 px-5 py-3">
                  <Search size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input value={eventSearch} onChange={event => setEventSearch(event.target.value)} placeholder="Search events" className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400" />
                </label>
              )}
              {visibleEvents.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <CalendarDays size={26} className="mx-auto text-neutral-400" />
                  <p className="mt-3 font-semibold text-neutral-800">{events.length ? 'No matching events' : 'No events available'}</p>
                  <p className="mt-1 text-sm text-neutral-500">{events.length ? 'Try another search.' : 'Create an event before managing event activity.'}</p>
                  {!events.length && <Link to="/organizer/events/create" className="mt-4 inline-flex"><Button size="sm">Create event</Button></Link>}
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {visibleEvents.map(event => (
                    <article key={event.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-neutral-900">{event.title}</h3>
                        <p className="mt-1 text-sm text-neutral-500">{new Date(event.startTime).toLocaleString()} · {event.venue}</p>
                        {section === 'tickets' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.ticketTypes.map(ticket => (
                              <span key={ticket.id} className="rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600">
                                {ticket.name} · {event.isFree ? 'Free' : `ZAR ${Number(ticket.price).toFixed(2)}`} · {Math.max(0, ticket.quantity - ticket.availableQuantity)} sold · {ticket.availableQuantity} left
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {section === 'tickets' && ['DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'PUBLISHED'].includes(event.status) ? (
                        <Link to={`/organizer/events/${event.id}/edit`} className="shrink-0">
                          <Button variant="secondary" size="sm"><Ticket size={15} /> Edit ticket types</Button>
                        </Link>
                      ) : section === 'tickets' ? (
                        <p className="shrink-0 text-right text-xs text-neutral-500">Ticket types can no longer be edited for this event.</p>
                      ) : (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-neutral-800">{Math.max(0, event.capacity - event.availableCapacity)} / {event.capacity} registered places</p>
                          <p className="mt-1 text-xs text-neutral-500">Attendee-level records aren’t available in the current API.</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {section !== 'tickets' && (
                <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
                  Attendee, booking, and ticket-management records are not yet exposed by the organizer API.
                </p>
              )}
            </section>
          ) : null}
    </OrganizerPageLayout>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-900">{value.toLocaleString()}</p>
    </div>
  );
}
