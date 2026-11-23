import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/useAuth';
import NotificationBell from '@/components/layout/NotificationBell';
import { useVendorApplicationCount } from '@/hooks/useVendorApplicationCount';
import {
  OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT,
  useDashboardNavigation,
} from '@/components/layout/dashboardNavigationState';
import vendorLogo from '@/assets/organizer-logo.png';

const items = [
  { label: 'Overview', to: '/vendor', icon: <OverviewIcon /> },
  { label: 'Find events', to: '/vendor/events', icon: <CalendarIcon /> },
  { label: 'My applications', to: '/vendor/applications', icon: <DocumentIcon /> },
  { label: 'Staff members', to: '/vendor/staff', icon: <UsersIcon /> },
  { label: 'Business profile', to: '/vendor/profile', icon: <ProfileIcon /> },
];

export default function VendorSidebar({ accountSubtitle }: { accountSubtitle?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navigation = useDashboardNavigation();
  const { count, error } = useVendorApplicationCount();
  const [notificationOpenTarget, setNotificationOpenTarget] = useState<'desktop' | 'mobile' | null>(null);
  const closeNotifications = useCallback(() => setNotificationOpenTarget(null), []);
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    const openSidebarNotifications = () => {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      if (!desktop && !navigation?.mobileOpen) {
        navigation?.toggle();
      }
      setNotificationOpenTarget(desktop ? 'desktop' : 'mobile');
    };

    window.addEventListener(OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT, openSidebarNotifications);
    return () => window.removeEventListener(OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT, openSidebarNotifications);
  }, [navigation]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="vendor-sidebar w-0 shrink-0 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:self-start">
      <aside className="hidden h-full flex-col overflow-y-auto border-r border-[#e7e7e7] bg-white px-2 py-4 md:flex">
        <Brand />
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-[#888]">Vendor</p>
        <nav className="space-y-1" aria-label="Vendor navigation">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/vendor' || item.to === '/vendor/applications'}
              className={({ isActive }) => `vendor-sidebar-action flex w-full items-center justify-between gap-1 rounded-lg px-2 py-2 text-left text-xs font-semibold transition ${
                isActive ? 'bg-[#fff0f1] text-[#e11d48]' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#171717]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </span>
              {item.to === '/vendor/applications' && (
                <span className="rounded-full bg-[#ededed] px-1.5 py-1 text-xs font-bold leading-none text-[#555]">
                  {error ? '!' : count ?? '…'}
                </span>
              )}
            </NavLink>
          ))}
          {user?.role === 'VENDOR' && <NotificationBell key={notificationOpenTarget === 'desktop' ? 'open' : 'closed'} appearance="sidebar" initiallyOpen={notificationOpenTarget === 'desktop'} onClose={closeNotifications} />}
        </nav>
        {error && <p role="alert" className="mt-2 px-2 text-xs text-rose-700">{error}</p>}
        <div className="mt-auto space-y-2">
          <VendorAccount initials={initials} subtitle={accountSubtitle} />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="vendor-sidebar-action vendor-logout-button flex min-h-9 w-full items-center gap-2 rounded-lg border border-rose-200 px-2 text-left text-xs font-semibold text-rose-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </aside>

      {navigation?.mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close vendor navigation"
            onClick={navigation.closeMobile}
            className="vendor-drawer-backdrop fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          />
          <aside id="vendor-navigation-drawer" className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-[#e7e7e7] bg-white px-2 py-4 shadow-xl md:hidden">
            <Brand />
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-[#888]">Vendor</p>
            <nav className="space-y-1" aria-label="Vendor navigation">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/vendor' || item.to === '/vendor/applications'}
                  onClick={navigation.closeMobile}
                  className={({ isActive }) => `vendor-sidebar-action flex w-full items-center justify-between gap-1 rounded-lg px-2 py-2 text-left text-xs font-semibold transition ${
                    isActive ? 'bg-[#fff0f1] text-[#e11d48]' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#171717]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                  {item.to === '/vendor/applications' && (
                    <span className="rounded-full bg-[#ededed] px-1.5 py-1 text-xs font-bold leading-none text-[#555]">
                      {error ? '!' : count ?? '…'}
                    </span>
                  )}
                </NavLink>
              ))}
              {user?.role === 'VENDOR' && <NotificationBell key={notificationOpenTarget === 'mobile' ? 'open' : 'closed'} appearance="sidebar" initiallyOpen={notificationOpenTarget === 'mobile'} onClose={closeNotifications} />}
            </nav>
            {error && <p role="alert" className="mt-2 px-2 text-xs text-rose-700">{error}</p>}
            <div className="mt-auto space-y-2 pt-4">
              <VendorAccount initials={initials} subtitle={accountSubtitle} />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="vendor-sidebar-action vendor-logout-button flex min-h-9 w-full items-center gap-2 rounded-lg border border-rose-200 px-2 text-left text-xs font-semibold text-rose-700 transition"
              >
                <LogoutIcon />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

    </div>
  );
}

export function VendorMenuButton() {
  const navigation = useDashboardNavigation();

  return (
    <button
      type="button"
      aria-label="Open vendor navigation"
      aria-controls="vendor-navigation-drawer"
      aria-expanded={navigation?.mobileOpen ?? false}
      onClick={navigation?.toggle}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e5e5e5] text-[#444] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d15d2d] md:hidden"
    >
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

function VendorAccount({ initials, subtitle }: { initials: string; subtitle?: string }) {
  const { user } = useAuth();
  const navigation = useDashboardNavigation();

  return (
    <Link to="/vendor/profile" onClick={navigation?.closeMobile} className="vendor-sidebar-action block rounded-lg border border-[#e7e7e7] bg-white p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xs font-bold text-white">
          {initials || 'V'}
        </div>
        <div className="min-w-0">
          <p className="vendor-account-name truncate text-xs font-bold leading-tight text-[#222]">{user ? `${user.firstname} ${user.lastname}` : 'Vendor'}</p>
          <p className="vendor-account-subtitle truncate text-[11px] leading-tight text-[#888]">{subtitle ?? user?.email}</p>
        </div>
      </div>
    </Link>
  );
}

function Brand() {
  return (
    <div className="mb-5 flex items-center gap-2 px-1">
      <img src={vendorLogo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" />
      <div className="text-sm font-extrabold tracking-tight text-[#262626]">EventMS</div>
    </div>
  );
}

function OverviewIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12.75V5.5A1.5 1.5 0 014.5 4H9l2 3h8.5A1.5 1.5 0 0121 8.5v4.25m-18 0H8.5A1.5 1.5 0 0010 18.25V20m-7-7.25h18" /></svg>;
}

function CalendarIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6a1 1 0 011-1z" /></svg>;
}

function DocumentIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z" /></svg>;
}

function UsersIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

function ProfileIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zm7 9a7 7 0 00-14 0" /></svg>;
}

function LogoutIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5m0 0-5-5m5 5H9m4 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1" /></svg>;
}
