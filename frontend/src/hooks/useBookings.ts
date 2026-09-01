import { useState, useEffect } from 'react';
import { getMyBookings } from '@/services/bookingService';
import type { Booking } from '@/types/booking';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getMyBookings()
      .then(r => setBookings(r.data))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  return { bookings, loading, error };
}
