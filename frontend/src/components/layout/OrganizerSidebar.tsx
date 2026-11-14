import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDashboardNavigation } from '@/components/layout/dashboardNavigationState';

const items = [
  { label: 'Overview', to: '/organizer', path: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7' },
  { label: 'My events', to: '/organizer/events', path: 'M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z' },
  { label: 'Create event', to: '/organizer/events/new', path: 'M12 5v14M5 12h14' },
  { label: 'Reports', to: '/organizer/reports', path: 'M4 20h16M6 17v-5h3v5m3 0V7h3v10m3 0V4h3v13' },
  { label: 'Notifications', to: '/organizer/notifications', path: 'M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8ZM10 19a2 2 0 0 0 4 0' },
  { label: 'Profile Organization', to: '/organizer/profile', path: 'M4 5h16v15H4zM4 9h16M8 13h8m-8 3h5' },
];

export default function OrganizerSidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigation = useDashboardNavigation();
  const mobileOpen = navigation?.mobileOpen ?? false;
  const compact = Boolean(navigation?.collapsed && !mobileOpen);
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase() || 'OR';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close dashboard sidebar" onClick={navigation?.closeMobile} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
      <aside
        id="dashboard-sidebar"
        className={`shrink-0 self-start overflow-hidden rounded-xl border border-[#8b20b3] bg-gradient-to-br from-[#8b20b3] to-[#bb287b] text-white ${
          mobileOpen
            ? 'fixed inset-y-3 left-3 z-50 w-64 overflow-y-auto lg:sticky lg:inset-auto lg:top-4 lg:z-auto'
            : `relative w-full lg:sticky lg:top-4 ${compact ? 'lg:w-20' : 'lg:w-60'}`
        }`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full border-[18px] border-white/10" />
          <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-white/10" />
        </div>
        <div className={`relative flex flex-col lg:min-h-[min(42rem,calc(100dvh-2rem))] ${mobileOpen ? 'min-h-full' : ''}`}>
          <div className={`flex items-center py-5 ${compact ? 'justify-center px-2' : 'gap-2.5 px-5'}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-600 to-orange-500 text-white">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1z" />
              </svg>
            </span>
            {!compact && <span className="text-base font-bold text-white">EventMS</span>}
          </div>
          <nav aria-label="Organizer navigation" className="flex-1 px-3">
            {!compact && <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wide text-white">Organizer</p>}
            <div className="space-y-1">
              {items.map(item => {
                const active = item.to === '/organizer/events'
                  ? pathname === item.to || (pathname.startsWith(`${item.to}/`) && pathname !== '/organizer/events/new')
                  : pathname === item.to;
                const classes = `flex w-full items-center gap-3 rounded-lg py-2.5 text-left text-sm transition-colors ${compact ? 'justify-center px-2' : 'px-3'} ${
                  active ? 'bg-[#ffffff] font-semibold text-[#7921ac]' : 'text-white hover:bg-white/10'
                }`;
                const icon = <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d={item.path} /></svg>;
                return (
                  <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} onClick={navigation?.closeMobile} title={compact ? item.label : undefined} className={classes}>
                    {icon}{!compact && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="space-y-2 p-3">
            <Link to="/organizer/profile" onClick={navigation?.closeMobile} title={compact ? 'Profile Organization' : undefined} className={`flex items-center rounded-xl border border-white/40 p-2 text-white hover:bg-white/10 ${compact ? 'justify-center' : 'gap-2.5'}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e11d48] text-xs font-bold text-white">{initials}</span>
              {!compact && <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{user?.firstname} {user?.lastname}</span>
                <span className="block truncate text-[11px] text-white">{user?.organizationName || 'Organizer'}</span>
              </span>}
            </Link>
            <button type="button" onClick={() => void handleLogout()} className="w-full rounded-lg px-2 py-1 text-xs text-white hover:bg-white/10" title="Logout">
              {compact ? '↪' : 'Logout'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
