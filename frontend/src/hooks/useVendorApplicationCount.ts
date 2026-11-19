import { useEffect, useState } from 'react';
import { useAuth } from '@/context/useAuth';
import { getMyApplications } from '@/services/vendorService';

export function useVendorApplicationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'VENDOR') return;

    let active = true;
    getMyApplications()
      .then(response => {
        if (active) setCount(response.data.data.length);
      })
      .catch(() => {
        if (active) setError('Unable to load application count.');
      });

    return () => { active = false; };
  }, [user?.role]);

  return { count, error };
}
