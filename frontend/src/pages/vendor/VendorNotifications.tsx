import { useEffect, useState } from 'react';
import axios from 'axios';
import { BellRing, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '@/services/notificationService';

export default function VendorNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  const loadNotifications = async () => {
    setError('');
    try {
      const response = await getNotifications();
      setNotifications(response.data.data);
    } catch (loadError) {
      setError(axios.isAxiosError<{ message?: string }>(loadError)
        ? loadError.response?.data.message ?? 'Notifications could not be loaded.'
        : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getNotifications()
      .then(response => { if (active) setNotifications(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Notifications could not be loaded.'
          : 'Notifications could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const markRead = async (notification: AppNotification) => {
    if (notification.readAt || working) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await markNotificationRead(notification.id);
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (requestError) {
      setError(axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data.message ?? 'This notification could not be marked as read.'
        : 'This notification could not be marked as read.');
    } finally {
      setWorking(false);
    }
  };

  const markAllRead = async () => {
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await markAllNotificationsRead();
      setNotifications(current => current.map(item => item.readAt ? item : { ...item, readAt: new Date().toISOString() }));
      setMessage('All notifications marked as read.');
    } catch (requestError) {
      setError(axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data.message ?? 'Notifications could not be marked as read.'
        : 'Notifications could not be marked as read.');
    } finally {
      setWorking(false);
    }
  };

  const unreadCount = notifications.filter(notification => !notification.readAt).length;

  return (
    <VendorPortalLayout businessName={businessName} title="Notifications" subtitle="Application decisions and important Vendor account updates.">
      <div className="space-y-5">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823]">
          <div><p className="text-sm text-slate-500 dark:text-slate-400">Unread notifications</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : unreadCount}</p></div>
          <Button variant="secondary" className="h-10 rounded-xl" onClick={() => void markAllRead()} disabled={working || loading || unreadCount === 0}><CheckCheck size={16} /> Mark all as read</Button>
        </section>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error} <button type="button" onClick={() => void loadNotifications()} className="ml-1 font-semibold underline">Retry</button></p>}
        {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
        {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && notifications.length === 0 ? null : notifications.length ? (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-white/[0.07] dark:border-white/10 dark:bg-[#171823]">
            {notifications.map(notification => (
              <li key={notification.id} className={`flex gap-4 p-5 ${notification.readAt ? '' : 'bg-violet-50/60 dark:bg-violet-500/[0.06]'}`}>
                <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.readAt ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300'}`}><BellRing size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h2>{!notification.readAt && <Badge variant="info">New</Badge>}</div>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{notification.message}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{new Date(notification.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <Link to={notification.link} onClick={() => void markRead(notification)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">Open notification</Link>
                    {!notification.readAt && <button type="button" onClick={() => void markRead(notification)} disabled={working} className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white">Mark as read</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#171823]">
            <BellRing size={28} className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No notifications</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Vendor account updates will appear here.</p>
          </div>
        )}
      </div>
    </VendorPortalLayout>
  );
}
