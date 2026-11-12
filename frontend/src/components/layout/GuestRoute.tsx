import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';
import type { UserRole } from '@/types/user';

const dashboardPath: Record<UserRole, string> = {
  ORGANIZER: '/organizer',
  VENDOR: '/vendor',
  ADMIN: '/admin',
  ATTENDEE: '/attendee',
};

export default function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // Already logged in → send to their dashboard
  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : dashboardPath[user.role]} replace />;

  return <Outlet />;
}
