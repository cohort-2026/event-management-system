import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';

export interface SidebarItem {
  label: string;
  to: string;
  icon: ReactNode;
}

interface DashboardSidebarProps {
  title: string;
  subtitle: string;
  items: SidebarItem[];
}

export default function DashboardSidebar({ title, subtitle, items }: DashboardSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

//   const initials = `${user?.firstname?.[0] ?? 'E'}${user?.lastname?.[0] ?? 'M'}`;

  return (
    <aside className="w-full lg:w-[290px] shrink-0">
      <div className="bg-white rounded-[2rem] border border-neutral-200 shadow-sm shadow-neutral-900/5 overflow-hidden sticky top-20">
        <div className="px-6 py-6 border-b border-neutral-100 bg-brand-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/12 border border-white/20 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-100">EventMS</p>
              <p className="text-base font-black text-white mt-1">{title}</p>
            </div>
          </div>
        </div>

        {/* <div className="px-5 py-5 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-black text-sm shadow-sm border-4 border-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-neutral-900 truncate">{user?.firstname} {user?.lastname}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 truncate">{subtitle}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div> */}

        <div className="px-5 py-5">
          <div className="mb-3">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-700">{subtitle}</span>
          </div>
          <nav className="space-y-1">
            {items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/vendor' || item.to === '/organizer' || item.to === '/management/reports' || item.to === '/platform-admin' || item.to === '/platform-admin/settings'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-brand-100 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-700',
                  ].join(' ')
                }
              >
                <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 bg-white">
          <div className="flex items-center justify-between gap-3">
            {/* <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-neutral-400">Profile</div>
                <div className="text-sm font-bold text-neutral-800">{user?.role}</div>
              </div>
            </div> */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3h5a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  breadcrumbs = [],
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}) {
  const { user } = useAuth();
  const initials = `${user?.firstname?.[0] ?? 'E'}${user?.lastname?.[0] ?? 'M'}`;

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 bg-white rounded-3xl border border-neutral-200 shadow-sm mb-6">
      <div>
        <nav className="flex items-center flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-neutral-400 mb-2">
          <Link to="/" className="hover:text-brand-700 transition-colors">Home</Link>
          {breadcrumbs.length > 0 && <span>/</span>}
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-2">
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-brand-700 transition-colors">{crumb.label}</Link>
              ) : (
                <span className="text-neutral-700">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>
        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-700">Dashboard</span>
        <h1 className="text-2xl font-black text-neutral-900 mt-1 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="relative w-11 h-11 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-brand-50 transition-colors flex items-center justify-center text-neutral-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 border-2 border-white" />
        </button>
        <div className="flex items-center gap-3 pl-3 border-l border-neutral-200">
          <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-black shadow-sm ring-4 ring-white">
            {initials}
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-black text-neutral-900 block">{user?.firstname} {user?.lastname}</span>
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wide block">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
