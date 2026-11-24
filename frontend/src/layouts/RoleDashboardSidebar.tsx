import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import type { UserRole } from '@/types/user';
import { useAuth } from '@/context/useAuth';
import { useDashboardNavigation } from '@/layouts/dashboardNavigationState';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export interface DashboardNavItem {
  label: string;
  to: string;
  icon: ReactNode;
  badge?: ReactNode;
  end?: boolean;
  isActive?: (pathname: string) => boolean;
}

export default function RoleDashboardSidebar({ role, items, profileTo, accountSubtitle, afterNavigation, className = '' }: {
  role: Exclude<UserRole, 'ATTENDEE'>;
  items: DashboardNavItem[];
  profileTo?: string;
  accountSubtitle?: string;
  afterNavigation?: ReactNode | ((mobile: boolean) => ReactNode);
  className?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navigation = useDashboardNavigation();
  const [first = 'E', last = 'M'] = [user?.firstname?.[0], user?.lastname?.[0]];
  const initials = `${first}${last}`.toUpperCase();
  const collapsed = Boolean(navigation?.collapsed);
  const title = role === 'ADMIN' ? 'Administrator' : role === 'ORGANIZER' ? 'Organizer' : 'Vendor';
  const closeMobile = () => navigation?.closeMobile();
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); closeMobile(); };

  const content = (mobile = false) => <div className="flex min-h-full flex-col">
    <div className={`flex h-16 shrink-0 items-center border-b border-neutral-200 px-4 dark:border-neutral-800 ${collapsed && !mobile ? 'justify-center' : 'gap-3'}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white"><CalendarDays className="size-5" aria-hidden="true" /></span>
      {(!collapsed || mobile) && <span className="font-heading text-base font-bold tracking-tight text-neutral-950 dark:text-white">EventMS</span>}
      {!mobile && navigation && <button type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={navigation.toggle} className="ml-auto hidden size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-orange-500 lg:flex dark:hover:bg-neutral-800">{collapsed ? <ChevronRight className="size-4"/> : <ChevronLeft className="size-4"/>}</button>}
    </div>
    <div className={`px-3 pb-3 pt-5 ${collapsed && !mobile ? 'lg:px-2' : ''}`}>
      {(!collapsed || mobile) && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.14em] text-neutral-500">{title}</p>}
      <nav aria-label={`${title} navigation`} className="space-y-1">
        {items.map(item => <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMobile} title={collapsed && !mobile ? item.label : undefined}
          className={({ isActive }) => {
            const active = item.isActive ? item.isActive(pathname) : isActive;
            return `group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 ${collapsed && !mobile ? 'lg:justify-center lg:px-2' : ''} ${active ? 'bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'}`;
          }}>
          <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>
          {(!collapsed || mobile) && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
          {item.badge && (!collapsed || mobile) && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-900 dark:bg-orange-950 dark:text-orange-200">{item.badge}</span>}
        </NavLink>)}
      </nav>
      {afterNavigation && <div className={`mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800 ${collapsed && !mobile ? 'lg:hidden' : ''}`}>{typeof afterNavigation === 'function' ? afterNavigation(mobile) : afterNavigation}</div>}
    </div>
    <div className="mt-auto space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
      {profileTo ? <Link to={profileTo} onClick={closeMobile} className={`flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 p-2.5 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-orange-500 dark:border-neutral-800 dark:hover:bg-neutral-800 ${collapsed && !mobile ? 'lg:justify-center lg:border-transparent lg:p-1' : ''}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white dark:bg-orange-500">{initials}</span>
        {(!collapsed || mobile) && <span className="min-w-0"><span className="block truncate text-xs font-semibold text-neutral-900 dark:text-white">{user ? `${user.firstname} ${user.lastname}` : title}</span><span className="block truncate text-[11px] text-neutral-500">{accountSubtitle ?? user?.email ?? title}</span></span>}
      </Link> : <div className={`flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-800 ${collapsed && !mobile ? 'lg:justify-center lg:border-transparent lg:p-1' : ''}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white dark:bg-orange-500">{initials}</span>
        {(!collapsed || mobile) && <span className="min-w-0"><span className="block truncate text-xs font-semibold text-neutral-900 dark:text-white">{user ? `${user.firstname} ${user.lastname}` : title}</span><span className="block truncate text-[11px] text-neutral-500">{accountSubtitle ?? user?.email ?? title}</span></span>}
      </div>}
      <button type="button" onClick={() => void handleLogout()} title={collapsed && !mobile ? 'Sign out' : undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-rose-500 dark:text-neutral-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-200 ${collapsed && !mobile ? 'lg:justify-center lg:px-2' : ''}`}><LogOut className="size-4 shrink-0"/>{(!collapsed || mobile) && 'Sign out'}</button>
    </div>
  </div>;

  return <>
    <aside id="dashboard-sidebar" className={`hidden w-60 shrink-0 border-r border-neutral-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col dark:border-neutral-800 dark:bg-neutral-900 ${collapsed ? 'lg:w-[76px]' : ''} ${className}`}>{content()}</aside>
    <Sheet open={navigation?.mobileOpen ?? false} onOpenChange={open => { if (!open) closeMobile(); }}>
      <SheetContent id="dashboard-sidebar-mobile" side="left" className="flex flex-col p-0 lg:hidden"><SheetTitle className="sr-only">{title} navigation</SheetTitle>{content(true)}</SheetContent>
    </Sheet>
  </>;
}

export function DashboardMenuButton({ label = 'Open navigation', className = '' }: { label?: string; className?: string }) {
  const navigation = useDashboardNavigation();
  return <button type="button" aria-label={label} aria-controls="dashboard-sidebar-mobile" aria-expanded={navigation?.mobileOpen ?? false} onClick={navigation?.toggle} className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-orange-500 lg:hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 ${className}`}>
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  </button>;
}
