import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
import NotificationBell from '@/components/layout/NotificationBell';
import { useVendorApplicationCount } from '@/hooks/useVendorApplicationCount';
import { useDashboardNavigation } from '@/components/layout/dashboardNavigationState';

const items = [
  { label: 'Overview', to: '/vendor', icon: <OverviewIcon /> },
  { label: 'Find events', to: '/vendor/events', icon: <CalendarIcon /> },
  { label: 'My applications', to: '/vendor/applications', icon: <DocumentIcon /> },
  { label: 'Staff passes', to: '/vendor/staff', icon: <UsersIcon /> },
  { label: 'Business profile', to: '/vendor/profile', icon: <ProfileIcon /> },
];

export default function VendorSidebar({ accountSubtitle }: { accountSubtitle?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navigation = useDashboardNavigation();
  const { count, error } = useVendorApplicationCount();
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase();
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="w-full shrink-0 bg-white min-[1024px]:sticky min-[1024px]:top-0 min-[1024px]:h-screen min-[1024px]:w-[220px] min-[1024px]:self-start">
      <aside className="hidden h-full flex-col border-r border-[#e7e7e7] bg-white px-3 py-4 min-[1024px]:flex">
        <Brand />
        <p className="mb-3 px-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#888]">Vendor</p>
        <nav className="space-y-1.5" aria-label="Vendor navigation">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/vendor' || item.to === '/vendor/applications'}
              className={({ isActive }) => `flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-[12px] font-semibold transition ${
                isActive ? 'bg-[#fff0f1] text-[#e11d48]' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#171717]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                <span className="whitespace-nowrap text-[12px]">{item.label}</span>
              </span>
              {item.to === '/vendor/applications' && (
                <span className="rounded-full bg-[#ededed] px-2 py-1 text-[12px] font-bold leading-none text-[#555]">
                  {error ? '!' : count ?? '…'}
                </span>
              )}
            </NavLink>
          ))}
          {user?.role === 'VENDOR' && <NotificationBell appearance="sidebar" />}
        </nav>
        {error && <p role="alert" className="mt-2 px-2 text-[12px] text-rose-700">{error}</p>}
        <div className="mt-auto space-y-2">
          <VendorAccount initials={initials} subtitle={accountSubtitle} />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-rose-200 px-3 text-left text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
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
            className="fixed inset-0 z-40 bg-slate-950/50 min-[1024px]:hidden"
          />
          <aside id="vendor-navigation-drawer" className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-[#e7e7e7] bg-white px-3 py-4 shadow-xl min-[1024px]:hidden">
            <Brand />
            <p className="mb-3 px-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#888]">Vendor</p>
            <nav className="space-y-1.5" aria-label="Vendor navigation">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/vendor' || item.to === '/vendor/applications'}
                  onClick={navigation.closeMobile}
                  className={({ isActive }) => `flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-[12px] font-semibold transition ${
                    isActive ? 'bg-[#fff0f1] text-[#e11d48]' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#171717]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                    <span className="whitespace-nowrap text-[12px]">{item.label}</span>
                  </span>
                  {item.to === '/vendor/applications' && (
                    <span className="rounded-full bg-[#ededed] px-2 py-1 text-[12px] font-bold leading-none text-[#555]">
                      {error ? '!' : count ?? 'â€¦'}
                    </span>
                  )}
                </NavLink>
              ))}
              {user?.role === 'VENDOR' && <NotificationBell appearance="sidebar" />}
            </nav>
            {error && <p role="alert" className="mt-2 px-2 text-[12px] text-rose-700">{error}</p>}
            <div className="mt-auto space-y-2 pt-4">
              <VendorAccount initials={initials} subtitle={accountSubtitle} />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-rose-200 px-3 text-left text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                <LogoutIcon />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      <nav className="hidden" aria-label="Vendor navigation">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/vendor' || item.to === '/vendor/applications'}
            className={({ isActive }) => `flex min-w-0 items-center gap-2 rounded-md px-2.5 py-2 text-[12px] font-semibold transition ${
              isActive ? 'bg-[#fff0f1] text-[#e11d48]' : 'text-[#444] hover:bg-[#f5f5f5] hover:text-[#171717]'
            }`}
          >
            <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>
            <span className="min-w-0 text-[12px] leading-tight">{item.label}</span>
            {item.to === '/vendor/applications' && (
              <span className="rounded-full bg-[#ededed] px-1.5 py-0.5 text-[12px] font-bold text-[#555]">
                {error ? '!' : count ?? '…'}
              </span>
            )}
          </NavLink>
        ))}
        {user?.role === 'VENDOR' && <NotificationBell appearance="sidebar" compact />}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 px-2 py-2 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          <LogoutIcon />
          Logout
        </button>
      </nav>
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e5e5e5] text-[#444] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d15d2d] min-[1024px]:hidden"
    >
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

function VendorAccount({ initials, subtitle }: { initials: string; subtitle?: string }) {
  const { user } = useAuth();

  return (
    <div className="mt-auto rounded-lg border border-[#e7e7e7] bg-white p-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[12px] font-bold text-white">
          {initials || 'V'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-tight text-[#222]">{user ? `${user.firstname} ${user.lastname}` : 'Vendor'}</p>
          <p className="truncate text-[12px] leading-tight text-[#888]">{subtitle ?? user?.email}</p>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-5 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f0442d] text-white">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z" />
        </svg>
      </div>
      <div className="text-[16px] font-extrabold tracking-tight text-[#262626]">EventMS</div>
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
