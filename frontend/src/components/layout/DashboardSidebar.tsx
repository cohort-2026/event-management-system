import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useDashboardNavigation } from '@/components/layout/dashboardNavigationState';

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
  appearance?: 'default' | 'analytics';
}

export default function DashboardSidebar({ title, subtitle, items, appearance = 'analytics' }: DashboardSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const analyticsAppearance = appearance === 'analytics';
  const navigation = useDashboardNavigation();
  const collapsed = navigation?.collapsed ?? false;
  const mobileOpen = navigation?.mobileOpen ?? false;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close dashboard sidebar"
          onClick={navigation?.closeMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}
      <aside
        id="dashboard-sidebar"
        className={`shrink-0 self-start transition-[width,transform] duration-200 ${
          mobileOpen
            ? 'fixed inset-y-3 left-3 z-50 w-[min(290px,calc(100vw-1.5rem))] overflow-y-auto lg:sticky lg:inset-auto lg:top-20 lg:z-auto lg:w-[290px] lg:overflow-visible'
            : 'block w-full lg:sticky lg:top-20 lg:block'
        } ${!mobileOpen && (collapsed ? 'lg:w-[76px]' : 'lg:w-[290px]')}`}
      >
        <div className={`min-h-full overflow-hidden rounded-[1.5rem] border shadow-xl ${
          analyticsAppearance
            ? 'border-slate-800 bg-[#062747] shadow-slate-950/15'
            : 'bg-white border-neutral-200 shadow-neutral-900/5'
        }`}>
          <div className={`flex min-h-[92px] items-center border-b ${
            analyticsAppearance
              ? 'border-white/10 bg-[#05213b]'
              : 'border-neutral-100 bg-brand-900'
          } ${collapsed && !mobileOpen ? 'justify-center px-2 py-5' : 'gap-3 px-6 py-5'}`}>
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            {(!collapsed || mobileOpen) && <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${analyticsAppearance ? 'text-cyan-300' : 'text-brand-100'}`}>EventMS</p>
              <p className="text-base font-black text-white mt-1">{title}</p>
            </div>}
          </div>

        <div className={`min-h-[calc(100%-92px)] ${collapsed && !mobileOpen ? 'px-2 py-5' : 'px-4 py-5'}`}>
          {(!collapsed || mobileOpen) && <div className="mb-3">
            <span className={`px-3 text-[10px] font-black uppercase tracking-[0.2em] ${analyticsAppearance ? 'text-slate-400' : 'text-brand-700'}`}>{subtitle}</span>
          </div>}
          <nav className="space-y-1">
            {items.map(item => {
              const isExpanded = expandedItems.includes(item.to) ||
                Boolean(item.children?.some(child => location.pathname === child.to));
              const itemClass = `flex items-center gap-3 rounded-lg py-3 text-sm font-semibold transition-all duration-200 ${
                collapsed && !mobileOpen ? 'justify-center px-3' : 'px-4'
              }`;
              const activeClass = analyticsAppearance
                ? 'border-l-4 border-fuchsia-400 bg-[#493766] text-white shadow-md shadow-slate-950/20'
                : 'bg-brand-100 text-white shadow-sm';
              const inactiveClass = analyticsAppearance
                ? 'text-slate-200 hover:bg-white/10 hover:text-white'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-700';

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
                      title={collapsed && !mobileOpen ? item.label : undefined}
                      className={`${itemClass} w-full ${item.children.some(child => location.pathname === child.to) ? activeClass : inactiveClass}`}
                    >
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
                      {(!collapsed || mobileOpen) && <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.09 1.032l-4.25 4.5a.75.75 0 01-1.09 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </>}
                    </button>
                  ) : (
                    <NavLink
                      to={item.to}
                      end={item.to === '/admin' || item.to === '/vendor' || item.to === '/organizer' || item.to === '/organizer/events' || item.to === '/management/reports' || item.to === '/platform-admin' || item.to === '/platform-admin/settings'}
                      onClick={navigation?.closeMobile}
                      title={collapsed && !mobileOpen ? item.label : undefined}
                      className={({ isActive }) => `${itemClass} ${isActive ? activeClass : inactiveClass}`}
                    >
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
                      {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                    </NavLink>
                  )}
                  {item.children && isExpanded && (!collapsed || mobileOpen) && (
                    <div id={`sidebar-submenu-${item.to.replaceAll('/', '-')}`} className="mt-1 space-y-1">
                      {item.children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={navigation?.closeMobile}
                          className={({ isActive }) =>
                            `ml-8 block rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                              isActive
                                ? analyticsAppearance ? 'bg-white/10 text-cyan-200' : 'bg-brand-50 text-brand-700'
                                : analyticsAppearance ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-neutral-500 hover:bg-neutral-50 hover:text-brand-700'
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

        <div className={`border-t ${analyticsAppearance ? 'border-white/10 bg-[#05213b]' : 'border-neutral-100 bg-white'} ${collapsed && !mobileOpen ? 'px-2 py-4' : 'px-5 py-4'}`}>
          <div className={`flex items-center gap-3 ${collapsed && !mobileOpen ? 'justify-center' : 'justify-between'}`}>
            <button
              type="button"
              onClick={handleLogout}
              title={collapsed && !mobileOpen ? 'Logout' : undefined}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                analyticsAppearance
                  ? 'border-white/15 text-slate-200 hover:bg-white/10 hover:text-white'
                  : 'border-rose-100 text-rose-600 hover:bg-rose-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3h5a3 3 0 013 3v1" />
              </svg>
              {(!collapsed || mobileOpen) && 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  breadcrumbs = [],
  appearance = 'analytics',
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  appearance?: 'default' | 'analytics';
}) {
  const { user } = useAuth();
  const initials = `${user?.firstname?.[0] ?? 'E'}${user?.lastname?.[0] ?? 'M'}`;
  const analyticsAppearance = appearance === 'analytics';

  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-sm mb-6 sm:px-6 ${
      analyticsAppearance
        ? 'border-slate-200 bg-white shadow-slate-900/[0.04]'
        : 'bg-white border-neutral-200'
    }`}>
      <div>
        <nav className={`flex items-center flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.22em] mb-2 ${
          analyticsAppearance ? 'text-slate-400' : 'text-neutral-400'
        }`}>
          <Link to="/" className={`transition-colors ${analyticsAppearance ? 'text-slate-500 hover:text-blue-700' : 'hover:text-brand-700'}`}>Home</Link>
          {breadcrumbs.length > 0 && <span>/</span>}
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-2">
              {crumb.to ? (
                <Link to={crumb.to} className={`transition-colors ${analyticsAppearance ? 'text-slate-500 hover:text-blue-700' : 'hover:text-brand-700'}`}>{crumb.label}</Link>
              ) : (
                <span className="text-slate-700">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${analyticsAppearance ? 'text-blue-600' : 'text-brand-700'}`}>Dashboard</span>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black shadow-sm ring-4 ring-white ${
            analyticsAppearance ? 'bg-gradient-to-br from-teal-300 to-cyan-400 text-slate-950' : 'bg-brand-100 text-brand-700'
          }`}>
            {initials}
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-black text-slate-900">{user?.firstname} {user?.lastname}</span>
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
