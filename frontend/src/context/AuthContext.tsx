import { useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types/user';
import { getMe, logout as logoutApi } from '@/services/authService';
import { AuthContext } from '@/context/auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, call /api/auth/me to restore session from the httpOnly cookie.
  // If the cookie is absent or expired the request returns 401 and we stay logged out.
  useEffect(() => {
    getMe()
      .then(res => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await logoutApi().catch(() => null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
