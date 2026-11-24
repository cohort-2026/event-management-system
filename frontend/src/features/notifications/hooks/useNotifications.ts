import { useCallback, useEffect, useState } from 'react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/features/notifications/services/notificationService';

const updatedEvent = 'organizer-notifications-updated';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const load = async () => {
      const currentRequest = ++requestId;
      try {
        const response = await getNotifications();
        if (!active || currentRequest !== requestId) return;
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
        setError('');
      } catch {
        if (active && currentRequest === requestId) setError('Notifications could not be loaded.');
      } finally {
        if (active && currentRequest === requestId) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    window.addEventListener(updatedEvent, load);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener(updatedEvent, load);
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await markNotificationRead(id);
      window.dispatchEvent(new Event(updatedEvent));
      return true;
    } catch {
      setError('This notification could not be marked as read.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await markAllNotificationsRead();
      window.dispatchEvent(new Event(updatedEvent));
    } catch {
      setError('Notifications could not be marked as read.');
    } finally {
      setBusy(false);
    }
  }, []);

  return { notifications, unreadCount, loading, busy, error, markRead, markAllRead };
}
