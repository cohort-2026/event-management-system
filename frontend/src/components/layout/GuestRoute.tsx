import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';

const dashboardPath: Record<string, string> = {
  ORGANIZER:     '/organizer/dashboard',
  VENDOR:        '/vendor',
  ADMIN:         '/admin',
  PLATFORM_ADMIN:'/platform-admin/settings',
  MANAGEMENT:    '/management/reports',
  ATTENDEE:      '/attendee',
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
  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : (dashboardPath[user.role] ?? '/events')} replace />;

  return <Outlet />;
}
