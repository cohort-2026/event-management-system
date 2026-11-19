import { createContext } from 'react';
import type { User } from '@/types/user';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
