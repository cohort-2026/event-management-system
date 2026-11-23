import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '@/services/notificationService';

const pageSize = 20;

export default function VendorNotifications() {
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
        setNotifications(current => current.map(item => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
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
    <PageWrapper>
      <div className="vendor-dashboard-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />
          <div className="min-w-0 flex-1">
            <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-2">
                <VendorMenuButton />
                <span className="vendor-notifications-page-title truncate text-[12px] font-bold text-[#333]">Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField value={search} onChange={setSearch} />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-4 pb-8 pt-5 sm:px-6 lg:px-8">
              <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
                <button type="button" disabled={saving || unreadCount === 0} onClick={() => void markAllRead()} className="vendor-notifications-action vendor-button rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Marking as read…' : 'Mark all as read'}
                </button>
              </div>

              {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              {loading ? (
                <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading notifications…</div>
              ) : visibleNotifications.length ? (
                <section aria-label="All notifications" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {visibleNotifications.map(notification => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`vendor-notifications-action flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left last:border-b-0 hover:bg-slate-50 ${selectedNotificationId === notification.id ? 'bg-rose-50/60' : ''}`}
                    >
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-rose-600'}`} aria-label={notification.readAt ? 'Read' : 'Unread'} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900">{notification.title}</span>
                        <span className="mt-1 block text-sm text-slate-600">{notification.message}</span>
                        <span className="mt-2 block text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</span>
                      </span>
                      <span aria-hidden="true" className="text-slate-400">→</span>
                    </button>
                  ))}
                </section>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <BellOutlineIcon />
                  <h2 className="mt-3 text-base font-bold text-slate-900">{search ? 'No matching notifications' : 'No notifications yet'}</h2>
                  <p className="mt-1 text-sm text-slate-500">{search ? 'Try a different search.' : 'Updates about your applications and events will appear here.'}</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} className="vendor-notifications-action vendor-button rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-50">Previous</button>
                    <button type="button" disabled={page === totalPages || loading} onClick={() => setPage(value => value + 1)} className="vendor-notifications-action vendor-button rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function BellOutlineIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-slate-400" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
}
