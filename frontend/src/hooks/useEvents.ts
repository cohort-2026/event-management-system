import { publishedMockEvents } from '@/data/mockEvents';

export function useEvents() {
  return {
    events: publishedMockEvents,
    total: publishedMockEvents.length,
    loading: false,
    error: null,
  };
}
