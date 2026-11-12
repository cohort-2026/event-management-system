import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { organizerNavigation } from '@/components/organizer/organizerNavigation';

interface OrganizerDashboardSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export default function OrganizerDashboardSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: OrganizerDashboardSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');
  const isCollapsed = collapsed && !mobileOpen;
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const currentPage = pathname === '/organizer/events' ? 'events'
    : pathname === '/organizer/events/create' || pathname === '/organizer/events/new' ? 'create'
      : pathname.startsWith('/organizer/events/') && pathname.endsWith('/vendors') ? 'vendors'
        : pathname === '/organizer/attendees' ? 'attendees'
          : pathname === '/organizer/bookings' ? 'bookings'
            : pathname === '/organizer/tickets' ? 'tickets'
              : pathname === '/organizer/analytics' ? 'analytics'
                : pathname === '/organizer/reports' ? 'reports'
                  : pathname === '/organizer/notifications' ? 'notifications'
                    : pathname === '/organizer/help' ? 'help'
                      : 'overview';
  const initials = `${user?.firstname?.[0] ?? 'O'}${user?.lastname?.[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen, onCloseMobile]);

  const signOut = async () => {
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    }
  };

  const linkClass = (active: boolean) => [
    'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
    isCollapsed ? 'justify-center' : '',
    active
      ? 'bg-violet-600 text-white shadow-sm shadow-violet-950/20'
      : 'text-white hover:bg-white/10 hover:text-white',
  ].join(' ');

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}
      <aside className={[
        'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col bg-[#17152a]/70 text-white backdrop-blur-xl transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'lg:w-[5.25rem]' : 'lg:w-64',
      ].join(' ')}>
        <div className={`flex h-[4.5rem] shrink-0 items-center border-b border-white/10 ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
          <img
            src="/dream-event-logo.jpg"
            alt="Dream Event Management"
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
          {!isCollapsed && <span className="text-base font-bold tracking-tight">EventMS</span>}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg bg-transparent text-white hover:bg-transparent lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={17} className={collapsed ? 'rotate-180' : ''} />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`flex items-center border-b border-white/10 py-4 ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-sm font-bold text-white ring-1 ring-violet-300/30">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.firstname} {user?.lastname}</p>
              <p className="mt-0.5 text-xs text-white">Organizer</p>
            </div>
          )}
        </div>

        <nav aria-label="Organizer navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {!isCollapsed && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Workspace</p>}
          {organizerNavigation.filter(item => item.group === 'workspace').map(item => {
            const Icon = item.icon;
            const active = item.activeKey ? currentPage === item.activeKey : false;
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                aria-label={isCollapsed ? item.label : undefined}
                className={linkClass(active)}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          <div className="!mt-5 border-t border-white/10 pt-5">
            {!isCollapsed && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Account</p>}
            {organizerNavigation.filter(item => item.group === 'account').map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={linkClass(item.activeKey === 'settings'
                    ? location.pathname === '/organizer/settings' || location.pathname === '/organizer/profile'
                    : currentPage === item.activeKey)}
                >
                  <Icon size={18} className="shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          {logoutError && !isCollapsed && <p role="alert" className="mb-2 text-xs text-rose-300">{logoutError}</p>}
          <button
            type="button"
            onClick={() => void signOut()}
            title={isCollapsed ? 'Logout' : undefined}
            aria-label={isCollapsed ? 'Logout' : undefined}
            className={`${linkClass(false)} w-full`}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export function OrganizerMobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-transparent text-white lg:hidden"
      aria-label="Open navigation"
    >
      <Menu size={19} />
    </button>
  );
}
