import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AttendeeLayout from '@/components/attendee/AttendeeLayout';
import Button from '@/components/legacy/Button';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notificationService';

const pageSize = 20;

export default function AttendeeNotifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedNotificationId = (location.state as { selectedNotificationId?: string } | null)?.selectedNotificationId;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getNotifications(page, pageSize)
      .then(response => {
        if (!active) return;
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
        setTotalPages(Math.max(1, response.data.pagination.totalPages));
        setError('');
      })
      .catch(() => { if (active) setError('Unable to load your notifications. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const visibleNotifications = notifications.filter(notification =>
    `${notification.title} ${notification.message}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification.id);
        setNotifications(current => current.map(item => item.id === notification.id
          ? { ...item, readAt: new Date().toISOString() }
          : item));
        setUnreadCount(count => Math.max(0, count - 1));
      } catch {
        setError('This notification could not be marked as read.');
        return;
      }
    }
    navigate(notification.link);
  };

  const markAllRead = async () => {
    setSaving(true);
    setError('');
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications(current => current.map(item => ({ ...item, readAt })));
      setUnreadCount(0);
    } catch {
      setError('Notifications could not be marked as read.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AttendeeLayout>
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Your updates</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-950">Notifications</h1>
            <p className="mt-1 text-sm text-neutral-500">Event and booking updates in one place.</p>
          </div>
          <Button variant="secondary" size="sm" disabled={saving || unreadCount === 0} onClick={() => void markAllRead()}>
            {saving ? 'Marking as read…' : 'Mark all as read'}
          </Button>
        </header>

        <label className="mb-4 block max-w-md text-sm font-semibold text-neutral-700">
          Search notifications
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search your updates"
            className="mt-1 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 font-normal outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </label>

        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {loading ? (
          <div role="status" className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading notifications…</div>
        ) : visibleNotifications.length ? (
          <section aria-label="All notifications" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {visibleNotifications.map(notification => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={`flex w-full items-start gap-3 border-b border-neutral-100 p-4 text-left transition-colors last:border-b-0 hover:bg-rose-50/50 sm:p-5 ${selectedNotificationId === notification.id ? 'bg-rose-50/70' : ''}`}
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-rose-600'}`} aria-label={notification.readAt ? 'Read' : 'Unread'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-neutral-900">{notification.title}</span>
                  <span className="mt-1 block text-sm text-neutral-600">{notification.message}</span>
                  <span className="mt-2 block text-xs text-neutral-400">{new Date(notification.createdAt).toLocaleString('en-ZA')}</span>
                </span>
                <span aria-hidden="true" className="text-neutral-400">→</span>
              </button>
            ))}
          </section>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <BellOutlineIcon />
            </span>
            <h2 className="mt-3 text-base font-bold text-neutral-900">{search ? 'No matching notifications' : 'No notifications yet'}</h2>
            <p className="mt-1 text-sm text-neutral-500">{search ? 'Try another search.' : 'Updates about your bookings and events will appear here.'}</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-neutral-600">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page === totalPages || loading} onClick={() => setPage(value => value + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AttendeeLayout>
  );
}

function BellOutlineIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
}
