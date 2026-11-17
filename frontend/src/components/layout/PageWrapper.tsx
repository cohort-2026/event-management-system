import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/layout/NotificationBell';
import { DashboardNavigationProvider } from '@/components/layout/DashboardNavigationContext';

interface PageWrapperProps {
  children: React.ReactNode;
  backgroundClassName?: string;
}

export default function PageWrapper({ children, backgroundClassName = 'bg-[radial-gradient(ellipse_at_top_left,#554271_0%,#302d46_36%,#252a3d_100%)]' }: PageWrapperProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isDashboardRoute = ['/organizer', '/vendor', '/admin', '/attendee']
    .some(path => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <div className={`min-h-screen flex flex-col ${backgroundClassName}`}>
      <main className={`flex-1 page-container section-gap ${isDashboardRoute ? 'dashboard-shell' : ''}`}>
        {isDashboardRoute ? (
          <DashboardNavigationProvider key={pathname.split('/')[1]}>
            <div className="dashboard-content">{children}</div>
          </DashboardNavigationProvider>
        ) : (
          <>
            {user && (
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
