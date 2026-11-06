import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/user';
import Spinner from '@/components/ui/Spinner';

interface Props {
  roles?: UserRole[];
  /** Where to send unauthenticated users. Defaults to /login */
  redirectGuest?: string;
}

const dashboardPath: Record<UserRole, string> = {
  ORGANIZER:     '/organizer',
  VENDOR:        '/vendor',
  ADMIN:         '/admin',
  PLATFORM_ADMIN:'/platform-admin/settings',
  MANAGEMENT:    '/management/reports',
  ATTENDEE:      '/attendee',
};

export default function ProtectedRoute({ roles, redirectGuest = '/login' }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not logged in → send to login (or custom redirectGuest)
  if (!user) return <Navigate to={redirectGuest} replace />;
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Root redirect: send to role-specific dashboard
  if (redirectGuest === '/landing') {
    return <Navigate to={dashboardPath[user.role]} replace />;
  }

  // Wrong role → forbidden
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (
    user.role === 'VENDOR' &&
    user.vendorProfileStatus !== 'APPROVED' &&
    location.pathname !== '/vendor/profile' &&
    location.pathname !== '/vendor/events' &&
    location.pathname !== '/change-password'
  ) {
    return <Navigate to="/vendor/profile" replace />;
  }

  return <Outlet />;
}
