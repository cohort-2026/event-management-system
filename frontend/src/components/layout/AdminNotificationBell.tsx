import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from '@/services/notificationService';

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await getAdminNotifications();
        if (!active) return;
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
        setError('');
      } catch {
        if (active) setError('Notifications could not be loaded.');
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), 30_000);
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, []);

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.readAt) {
      try {
        await markAdminNotificationRead(notification.id);
        setNotifications(current => current.map(item =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ));
        setUnreadCount(count => Math.max(0, count - 1));
      } catch {
        setError('This notification could not be marked as read.');
        return;
      }
    }

    setOpen(false);
    navigate(notification.link);
  };

  const markAllRead = async () => {
    setBusy(true);
    setError('');
    try {
      await markAllAdminNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications(current => current.map(notification => ({ ...notification, readAt })));
      setUnreadCount(0);
    } catch {
      setError('Notifications could not be marked as read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-brand-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-bold text-neutral-900">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-4 py-2 text-xs text-rose-700">{error}</p>}
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">You’re all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
              {notifications.map(notification => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${notification.readAt ? '' : 'bg-brand-50/60'}`}
                  >
                    <span className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-amber-500'}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-neutral-900">{notification.title}</span>
                        <span className="mt-1 block text-sm text-neutral-600">{notification.message}</span>
                        <span className="mt-1 block text-xs text-neutral-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
