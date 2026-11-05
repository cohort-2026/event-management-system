import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminNotificationBell from '@/components/layout/AdminNotificationBell';

interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const showAdminBackButton = pathname.startsWith('/admin/') && pathname !== '/admin/';
  const showAdminNotifications = user?.role === 'ADMIN' && pathname.startsWith('/admin/');

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)] flex flex-col">
      <main className="flex-1 page-container section-gap">
        {showAdminNotifications && (
          <div className="mb-5 flex justify-end">
            <AdminNotificationBell />
          </div>
        )}
        {showAdminBackButton && (
          <Link
            to="/admin"
            className="mb-5 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M19 12H5m7 7-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to admin dashboard
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
