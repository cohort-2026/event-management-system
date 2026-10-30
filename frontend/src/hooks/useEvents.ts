import { useEffect, useState } from 'react';
import axios from 'axios';
import { publishedMockEvents } from '@/data/mockEvents';
import { getEvents } from '@/services/eventService';
import type { Event } from '@/types/event';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSampleEvents, setUsingSampleEvents] = useState(false);

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (!active) return;
        const publishedEvents = response.data.data.filter(event => event.status === 'PUBLISHED');
        const eventsToShow = publishedEvents.length > 0 ? publishedEvents : publishedMockEvents;
        setEvents(eventsToShow);
        setTotal(eventsToShow.length);
        setUsingSampleEvents(publishedEvents.length === 0);
      })
      .catch(loadError => {
        if (active) {
          setEvents(publishedMockEvents);
          setTotal(publishedMockEvents.length);
          setUsingSampleEvents(true);
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Events could not be loaded.')
            : 'Events could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { events, total, loading, error, usingSampleEvents };
}
