import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
import NotificationBell from '@/components/layout/NotificationBell';
import { DashboardNavigationProvider } from '@/components/layout/DashboardNavigationContext';

interface PageWrapperProps {
  children: React.ReactNode;
  appearance?: 'default' | 'light';
}

export default function PageWrapper({ children, appearance = 'default' }: PageWrapperProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const showAdminBackButton = pathname.startsWith('/admin/') && pathname !== '/admin/';
  const isEventDetailPage = pathname.startsWith('/events/');
  const isDashboardRoute = ['/organizer', '/vendor', '/admin', '/attendee']
    .some(path => pathname === path || pathname.startsWith(`${path}/`));
  const isOrganizerRoute = pathname === '/organizer' || pathname.startsWith('/organizer/');
  const isVendorRoute = pathname === '/vendor' || pathname.startsWith('/vendor/');
  const lightDashboard = appearance === 'light' && isDashboardRoute;

  return (
    <div className={`min-h-screen flex flex-col ${isOrganizerRoute ? 'bg-white' : lightDashboard ? 'bg-neutral-100' : 'bg-[radial-gradient(ellipse_at_top_left,#554271_0%,#302d46_36%,#252a3d_100%)]'}`}>
      <main className={`flex-1 page-container section-gap ${isDashboardRoute ? 'dashboard-shell' : ''} ${lightDashboard ? 'dashboard-shell-light' : ''} ${isOrganizerRoute ? 'organizer-shell' : ''}`}>
        {isDashboardRoute ? (
          <DashboardNavigationProvider key={pathname.split('/')[1]}>
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
            <div className={`dashboard-content ${lightDashboard ? 'dashboard-content-light' : ''} ${isVendorRoute ? 'vendor-dashboard-content' : ''}`}>{children}</div>
          </DashboardNavigationProvider>
        ) : (
          <>
            {user && !isEventDetailPage && (
              <div className="mb-5 flex justify-end">
                <NotificationBell />
              </div>
            )}
            {children}
          </>
        )}
      </main>
    </div>
  );
}
