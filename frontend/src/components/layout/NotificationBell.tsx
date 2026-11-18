import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notificationService';

export default function NotificationBell({
  appearance = 'default',
  compact = false,
}: {
  appearance?: 'default' | 'sidebar' | 'header';
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await getNotifications();
        if (!active) return;
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
        setError('');
      } catch {
        if (active) setError('Notifications could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), 30_000);
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        containerRef.current?.contains(target as Node)
        || (target instanceof Element && target.closest('[data-notification-panel]'))
      ) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

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

    setOpen(false);
    navigate(notification.link);
  };

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={appearance === 'sidebar'
          ? `relative flex shrink-0 items-center gap-1.5 rounded-md font-semibold transition hover:bg-slate-100 hover:text-slate-900 ${
            compact ? 'w-full px-2.5 py-2 text-[12px]' : 'w-full px-2.5 py-2.5 text-[12px]'
          } ${open ? 'bg-[#fff0f1] text-[#e11d48]' : 'text-[#444]'}`
          : appearance === 'header'
            ? 'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800'
            : 'relative flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-brand-50'}
      >
        <svg className={appearance === 'sidebar' ? 'h-4 w-4 shrink-0' : appearance === 'header' ? 'h-4 w-4' : 'h-5 w-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {appearance === 'sidebar' && <span className="flex-1 text-left">Notifications</span>}
        {unreadCount > 0 && (
          <span className={appearance === 'header'
            ? 'absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#e11d48] px-0.5 text-[10px] font-bold leading-none text-white'
            : appearance === 'sidebar'
              ? 'ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#e11d48] px-1 text-[10px] font-bold leading-none text-white'
              : 'absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-[10px] font-bold leading-none text-white'}>
            {appearance === 'header' ? '' : unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          data-notification-panel
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
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
            {loading ? (
              <p role="status" className="px-4 py-8 text-center text-sm text-neutral-500">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">You’re all caught up.</p>
            ) : (
              <ul className="max-h-[calc(100dvh-6rem)] divide-y divide-neutral-100 overflow-y-auto">
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
        </div>,
        document.body,
      )}
    </div>
  );
}
