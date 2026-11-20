import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/services/notificationService';

export default function OrganizerNotificationInbox() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, busy, error, markRead, markAllRead } = useNotifications();

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt && !await markRead(notification.id)) return;
    navigate(notification.link);
  };

  return (
    <section className="organizer-notification-card overflow-hidden rounded-xl border border-black/20 text-[#15100e] shadow-sm" aria-labelledby="inbox-heading">
      <div className="flex items-center justify-between gap-3 border-b border-black/20 px-5 py-4">
        <h2 id="inbox-heading" className="font-bold">Inbox ({unreadCount} unread)</h2>
        {unreadCount > 0 && (
          <button type="button" disabled={busy} onClick={() => void markAllRead()} className="text-sm font-semibold underline disabled:opacity-50">
            Mark all as read
          </button>
        )}
      </div>
      {error && <p role="alert" className="px-5 py-4 text-sm font-semibold">{error}</p>}
      {loading ? (
        <p role="status" className="px-5 py-4 text-sm">Loading notifications...</p>
      ) : notifications.length === 0 && !error ? (
        <p className="px-5 py-4 text-sm">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-black/20">
          {notifications.map(notification => (
            <li key={notification.id}>
              <button type="button" disabled={busy} onClick={() => void openNotification(notification)} className={`w-full px-5 py-4 text-left hover:bg-black/5 disabled:opacity-50 ${notification.readAt ? '' : 'bg-rose-50'}`}>
                <span className="block font-semibold">{notification.title}{!notification.readAt && ' (unread)'}</span>
                <span className="mt-1 block text-sm">{notification.message}</span>
                <span className="mt-1 block text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
