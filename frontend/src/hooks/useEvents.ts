import { useState, useEffect } from 'react';
import { getEvents } from '@/services/eventService';
import type { Event } from '@/types/event';

export function useEvents() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    getEvents()
      .then(r => setEvents(r.data.data))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}
