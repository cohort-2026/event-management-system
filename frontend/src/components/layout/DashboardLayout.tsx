import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/user';
import NotificationBell from '@/components/layout/NotificationBell';

/* ── per-role nav items ─────────────────────────────────────────────────── */
const roleNav: Record<UserRole, { label: string; to: string; icon: React.ReactNode }[]> = {
  ORGANIZER: [
    { label: 'Overview',            to: '/organizer',                        icon: <HomeIcon /> },
    { label: 'Create Event',        to: '/organizer/events/new',             icon: <PlusIcon /> },
    { label: 'My Events',           to: '/events',                           icon: <CalIcon /> },
    { label: 'Registrations',       to: '/organizer/events/1/registrations', icon: <UsersIcon /> },
    { label: 'Vendor Applications', to: '/organizer/events/1/vendors',       icon: <StoreIcon /> },
    { label: 'Check-in',            to: '/organizer/events/1/check-in',      icon: <ScanIcon /> },
  ],
  VENDOR: [
    { label: 'Overview',         to: '/vendor',                        icon: <HomeIcon /> },
    { label: 'Browse Events',    to: '/vendor/events',                 icon: <CalIcon /> },
    { label: 'My Applications',  to: '/vendor/applications',           icon: <DocIcon /> },
    { label: 'Staff Management', to: '/vendor/staff',  icon: <UsersIcon /> },
  ],
  ADMIN: [
    { label: 'Overview',         to: '/admin',            icon: <HomeIcon /> },
    { label: 'User management',  to: '/admin/users',      icon: <UsersIcon /> },
    { label: 'Approved profiles', to: '/admin/user-accounts', icon: <UsersIcon /> },
    { label: 'Administrator accounts', to: '/admin/accounts', icon: <UsersIcon /> },
    { label: 'Audit history', to: '/admin/audit', icon: <DocIcon /> },
  ],
  ATTENDEE: [
    { label: 'Browse Events', to: '/events', icon: <CalIcon /> },
  ],
};

const roleLabel: Record<UserRole, string> = {
  ORGANIZER: 'Organizer', VENDOR: 'Vendor', ADMIN: 'Administrator',
  ATTENDEE: 'Attendee',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [avatarOpen, setAvatarOpen]     = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const navItems = user ? (roleNav[user.role] ?? []) : [];
  const initials = user ? `${user.firstname.charAt(0)}${user.lastname.charAt(0)}` : '?';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  /* close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen flex bg-neutral-100">

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64 bg-neutral-950 flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/8 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="font-extrabold text-white text-base tracking-tight">EventMS</span>
          <button className="ml-auto lg:hidden text-neutral-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile card */}
        <div className="px-4 py-5 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstname} {user?.lastname}</p>
              <p className="text-xs text-neutral-400 truncate">{user ? roleLabel[user.role] : ''}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2 truncate">{user?.email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest px-3 mb-2">Navigation</p>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to !== '/events'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-neutral-400 hover:bg-white/8 hover:text-white'}`
              }
            >
              <span className="w-4 h-4 shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: settings + logout */}
        <div className="px-3 py-4 border-t border-white/8 flex flex-col gap-0.5 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:bg-white/8 hover:text-white transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all w-full text-left"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top header ── */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center px-4 md:px-6 gap-4 shrink-0 sticky top-0 z-20 shadow-xs">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page breadcrumb area — filled by children via context if needed */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">

            {user?.role === 'ADMIN' && <NotificationBell />}

            {/* Avatar dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(o => !o)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium text-neutral-700">{user?.firstname}</span>
                <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-11 w-56 bg-white rounded-xl border border-neutral-200 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900">{user?.firstname} {user?.lastname}</p>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors text-left">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 transition-colors text-left">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                  </div>
                  <div className="p-1.5 border-t border-neutral-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Icons ── */
function HomeIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function CalIcon()      { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function PlusIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>; }
function UsersIcon()    { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function StoreIcon()    { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M6 21V7l6-4 6 4v14M9 13h6" /></svg>; }
function ScanIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function DocIcon()      { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
