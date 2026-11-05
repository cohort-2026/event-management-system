import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AdminNotificationBell from '@/components/layout/AdminNotificationBell';

export interface SidebarItem {
  label: string;
  to: string;
  icon: ReactNode;
  children?: { label: string; to: string }[];
}

interface DashboardSidebarProps {
  title: string;
  subtitle: string;
  items: SidebarItem[];
}

export default function DashboardSidebar({ title, subtitle, items }: DashboardSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
            {items.map(item => {
              const isExpanded = expandedItems.includes(item.to) ||
                Boolean(item.children?.some(child => location.pathname === child.to));
              const itemClass = 'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200';
              const activeClass = 'bg-brand-100 text-white shadow-sm';
              const inactiveClass = 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-700';

              return (
                <div key={item.to}>
                  {item.children ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`sidebar-submenu-${item.to.replaceAll('/', '-')}`}
                      onClick={() => setExpandedItems(current =>
                        current.includes(item.to)
                          ? current.filter(path => path !== item.to)
                          : [...current, item.to],
                      )}
                      className={`${itemClass} w-full ${item.children.some(child => location.pathname === child.to) ? activeClass : inactiveClass}`}
                    >
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.09 1.032l-4.25 4.5a.75.75 0 01-1.09 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <NavLink
                      to={item.to}
                      end={item.to === '/admin' || item.to === '/vendor' || item.to === '/organizer' || item.to === '/organizer/events' || item.to === '/management/reports' || item.to === '/platform-admin' || item.to === '/platform-admin/settings'}
                      className={({ isActive }) => `${itemClass} ${isActive ? activeClass : inactiveClass}`}
                    >
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  )}
                  {item.children && isExpanded && (
                    <div id={`sidebar-submenu-${item.to.replaceAll('/', '-')}`} className="mt-1 space-y-1">
                      {item.children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `ml-8 block rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                              isActive ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-50 hover:text-brand-700'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
        {(user?.role === 'ADMIN' || user?.role === 'PLATFORM_ADMIN') && <AdminNotificationBell />}
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
