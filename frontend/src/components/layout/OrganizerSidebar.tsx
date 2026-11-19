import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
import { useDashboardNavigation } from '@/components/layout/dashboardNavigationState';
import organizerLogo from '@/assets/organizer-logo.png';

const items = [
  { label: 'Overview', to: '/organizer', path: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7' },
  { label: 'My events', to: '/organizer/events', path: 'M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z' },
  { label: 'Vendors', to: '/organizer/vendors', path: 'M3 8h18l-2 12H5L3 8zm4 0 2-5h6l2 5M9 12v4m6-4v4' },
  { label: 'Create event', to: '/organizer/events/new', path: 'M12 5v14M5 12h14' },
  { label: 'Reports', to: '/organizer/reports', path: 'M4 20h16M6 17v-5h3v5m3 0V7h3v10m3 0V4h3v13' },
  { label: 'Notifications', to: '/organizer/notifications', path: 'M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8ZM10 19a2 2 0 0 0 4 0' },
  { label: 'Organization Profile', to: '/organizer/profile', path: 'M4 5h16v15H4zM4 9h16M8 13h8m-8 3h5' },
];

export default function OrganizerSidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigation = useDashboardNavigation();
  const mobileOpen = navigation?.mobileOpen ?? false;
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase() || 'OR';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {navigation && (
        <button type="button" onClick={navigation.toggle} aria-expanded={mobileOpen} aria-controls="dashboard-sidebar" className="m-3 mb-0 w-fit rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm lg:hidden">
          Menu
        </button>
      )}
      {mobileOpen && <button type="button" aria-label="Close dashboard sidebar" onClick={navigation?.closeMobile} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
      <aside
        id="dashboard-sidebar"
        className={`shrink-0 self-start overflow-hidden border-r border-neutral-200 bg-white text-neutral-900 ${
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto shadow-xl lg:sticky lg:inset-auto lg:top-0 lg:z-auto'
            : 'hidden lg:sticky lg:top-0 lg:block lg:w-60'
        }`}
      >
        <div className={`relative flex flex-col lg:min-h-screen ${mobileOpen ? 'min-h-full' : ''}`}>
          <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
            <img src={organizerLogo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" />
            <span className="text-base font-bold text-neutral-900">EventMS</span>
          </div>
          <nav aria-label="Organizer navigation" className="flex-1 px-3">
            <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Organizer</p>
            <div className="space-y-1">
              {items.map(item => {
                const active = item.to === '/organizer/events'
                  ? pathname === item.to || (pathname.startsWith(`${item.to}/`) && pathname !== '/organizer/events/new')
                  : pathname === item.to;
                const classes = `organizer-nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-[#fff0f2] font-semibold text-[#f01446]' : 'text-neutral-700'
                }`;
                const icon = <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d={item.path} /></svg>;
                return (
                  <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} onClick={navigation?.closeMobile} className={classes}>
                    {icon}<span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="space-y-2 p-3">
            <Link to="/organizer/profile" onClick={navigation?.closeMobile} className="organizer-profile-link flex items-center gap-2.5 rounded-xl border border-neutral-200 p-2 text-neutral-900 transition-colors">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e11d48] text-xs font-bold text-white">{initials}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{user?.firstname} {user?.lastname}</span>
                <span className="block truncate text-[11px] text-neutral-500">{user?.organizationName || 'Organizer'}</span>
              </span>
            </Link>
            <button type="button" onClick={() => void handleLogout()} className="organizer-logout coral-action w-full px-3 py-2 text-xs" title="Logout">
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
