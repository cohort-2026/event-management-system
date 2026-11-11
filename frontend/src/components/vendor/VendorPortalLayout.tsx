import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Store,
  Sun,
  Moon,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/layout/NotificationBell';

interface VendorPortalLayoutProps {
  businessName: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  headerActions?: ReactNode;
}

interface NavigationItem {
  label: string;
  to?: string;
  icon: LucideIcon;
  activeKey?: string;
  available: boolean;
}

const navigationSections: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', to: '/vendor/dashboard', icon: LayoutDashboard, activeKey: 'overview', available: true },
      { label: 'Browse Events', to: '/vendor/events', icon: CalendarDays, activeKey: 'browse', available: true },
      { label: 'My Applications', to: '/vendor/applications', icon: ClipboardList, activeKey: 'applications', available: true },
      { label: 'My Events', to: '/vendor/my-events', icon: BriefcaseBusiness, activeKey: 'events', available: true },
      { label: 'Services & Packages', to: '/vendor/services', icon: Package, activeKey: 'services', available: true },
      { label: 'Staff Management', to: '/vendor/staff', icon: Users, activeKey: 'staff', available: true },
      { label: 'Invoices & Payments', to: '/vendor/invoices', icon: CreditCard, activeKey: 'invoices', available: true },
      { label: 'Performance & Analytics', to: '/vendor/analytics', icon: BarChart3, activeKey: 'analytics', available: true },
      { label: 'Notifications', to: '/vendor/notifications', icon: BellRing, activeKey: 'notifications', available: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'My Profile', to: '/vendor/profile', icon: Store, activeKey: 'profile', available: true },
      { label: 'Settings', to: '/vendor/settings', icon: Settings, activeKey: 'settings', available: true },
      { label: 'Help & Support', icon: CircleHelp, activeKey: 'help', available: false },
    ],
  },
];

function getActiveKey(pathname: string, hash: string): string {
  if (pathname === '/vendor' && hash === '#upcoming-events') return 'events';
  if (pathname === '/vendor' && hash === '#recent-notifications') return 'notifications';
  if (pathname === '/vendor' || pathname === '/vendor/dashboard') return 'overview';
  if (pathname === '/vendor/events' || /^\/vendor\/events\/[^/]+(?:\/apply)?$/.test(pathname)) return 'browse';
  if (pathname === '/vendor/applications' || pathname === '/vendor/invoices') return pathname === '/vendor/invoices' ? 'invoices' : 'applications';
  if (pathname === '/vendor/my-events') return 'events';
  if (pathname === '/vendor/services') return 'services';
  if (pathname === '/vendor/analytics') return 'analytics';
  if (pathname === '/vendor/notifications') return 'notifications';
  if (pathname === '/vendor/staff' || pathname.startsWith('/vendor/applications/')) return 'staff';
  if (pathname === '/vendor/profile') return 'profile';
  if (pathname === '/vendor/settings') return 'settings';
  return 'overview';
}

export default function VendorPortalLayout({
  businessName,
  title,
  subtitle,
  children,
  headerActions,
}: VendorPortalLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('eventms-vendor-sidebar-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('eventms-theme') === 'dark');
  const activeKey = getActiveKey(location.pathname, location.hash);
  const initials = businessName.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase() || `${user?.firstname?.[0] ?? 'V'}${user?.lastname?.[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    localStorage.setItem('eventms-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('eventms-vendor-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  const signOut = async () => {
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    }
  };

  const closeMenu = () => setMobileOpen(false);

  return (
    <div data-theme-scope className={`vendor-portal min-h-screen bg-slate-50 text-slate-900 dark:bg-[#10111a] dark:text-slate-100 ${isDark ? 'dark' : ''}`}>
      <div className="flex min-h-screen">
        {mobileOpen && (
          <button type="button" aria-label="Close vendor navigation" onClick={closeMenu} className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" />
        )}
        <aside className={[
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col bg-[#17152a] text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-[5.25rem]' : 'lg:w-64',
        ].join(' ')}>
          <div className={`flex h-[4.5rem] shrink-0 items-center border-b border-white/10 ${collapsed ? 'lg:justify-center lg:px-2' : 'gap-3 px-5'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500">
              <CalendarDays size={19} aria-hidden="true" />
            </div>
            <span className={`${collapsed ? 'lg:hidden' : ''} text-base font-bold tracking-tight`}>EventMS</span>
            <button type="button" onClick={() => setCollapsed(value => !value)} className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <ChevronLeft size={17} className={collapsed ? 'rotate-180' : ''} />
            </button>
            <button type="button" onClick={closeMenu} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close vendor navigation">
              <X size={18} />
            </button>
          </div>
          <div className={`flex items-center border-b border-white/10 py-4 ${collapsed ? 'lg:justify-center lg:px-2' : 'gap-3 px-4'}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-sm font-bold text-violet-200 ring-1 ring-violet-300/30">{initials}</div>
            <div className={`${collapsed ? 'lg:hidden' : ''} min-w-0`}>
              <p className="truncate text-sm font-semibold">{businessName || `${user?.firstname ?? ''} ${user?.lastname ?? ''}`}</p>
              <p className="mt-0.5 text-xs text-violet-200">Vendor</p>
            </div>
          </div>
          <nav aria-label="Vendor navigation" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5">
            {navigationSections.map(section => (
              <div key={section.label}>
                {!collapsed && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section.label}</p>}
                <div className="space-y-1">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = item.activeKey === activeKey;
                    const classes = [
                      'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                      collapsed ? 'lg:justify-center' : '',
                      active ? 'bg-violet-600 text-white shadow-sm shadow-violet-950/20' : item.available ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'cursor-not-allowed text-slate-500',
                    ].join(' ');
                    return item.available && item.to ? (
                      <Link key={item.label} to={item.to} onClick={closeMenu} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={classes}>
                        <Icon size={18} className="shrink-0" />
                        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                      </Link>
                    ) : (
                      <span key={item.label} title={collapsed ? `${item.label} — not available yet` : 'Not available yet'} aria-disabled="true" className={classes}>
                        <Icon size={18} className="shrink-0" />
                        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                        {!collapsed && <span className="ml-auto text-[10px] text-slate-500">Soon</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="shrink-0 border-t border-white/10 p-3">
            {logoutError && <p role="alert" className="mb-2 px-3 text-xs text-rose-300">{logoutError}</p>}
            <button type="button" onClick={() => void signOut()} title={collapsed ? 'Logout' : undefined} aria-label={collapsed ? 'Logout' : undefined} className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white ${collapsed ? 'lg:justify-center' : ''}`}>
              <LogOut size={18} className="shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#151621]/90">
            <div className="flex min-h-[4.5rem] items-center gap-3 px-4 sm:px-6 xl:px-9">
              <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open vendor navigation" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200 lg:hidden">
                <Menu size={18} />
              </button>
              <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm sm:flex">
                <Link to="/vendor" className="text-slate-500 transition hover:text-violet-600 dark:text-slate-400">Vendor</Link>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{title}</span>
              </nav>
              <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
                {headerActions}
                <button type="button" onClick={() => setIsDark(value => !value)} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} title={`Switch to ${isDark ? 'light' : 'dark'} mode`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <NotificationBell />
                <div className="relative hidden sm:block">
                  <button type="button" onClick={() => setProfileMenuOpen(value => !value)} aria-expanded={profileMenuOpen} aria-haspopup="menu" className="flex max-w-56 items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-400/20 dark:text-violet-200">{initials}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{businessName || `${user?.firstname ?? ''} ${user?.lastname ?? ''}`}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">Vendor</span>
                    </span>
                  </button>
                  {profileMenuOpen && (
                    <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#20212e]">
                      <Link role="menuitem" to="/vendor/profile" onClick={() => setProfileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">Business profile</Link>
                      <button role="menuitem" type="button" onClick={() => void signOut()} className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Logout</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          <main className="vendor-portal-content mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Vendor workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
