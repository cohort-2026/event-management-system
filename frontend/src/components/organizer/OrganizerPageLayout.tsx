import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import OrganizerDashboardSidebar, { OrganizerMobileMenuButton } from '@/components/organizer/OrganizerDashboardSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import { Moon, Sun } from 'lucide-react';

interface OrganizerPageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  headerActions?: ReactNode;
  children: ReactNode;
}

export default function OrganizerPageLayout({
  title,
  subtitle,
  breadcrumbs = [],
  headerActions,
  children,
}: OrganizerPageLayoutProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('eventms-organizer-sidebar-collapsed') === 'true',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('eventms-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('eventms-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('eventms-organizer-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div data-theme-scope className={`organizer-page min-h-screen bg-slate-50 text-slate-900 dark:bg-[#10111a] dark:text-slate-100 ${isDark ? 'dark' : ''}`}>
      <div className="flex min-h-screen">
        <OrganizerDashboardSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setCollapsed(value => !value)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#151621]/90">
            <div className="flex min-h-[4.5rem] items-center gap-3 px-4 sm:px-6 xl:px-9">
              <div className="lg:hidden">
                <OrganizerMobileMenuButton onClick={() => setMobileOpen(true)} />
              </div>
              <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm sm:flex">
                <Link to="/organizer/dashboard" className="text-slate-500 transition hover:text-violet-600 dark:text-slate-400">Organizer</Link>
                {breadcrumbs.map((breadcrumb, index) => (
                  <span key={`${breadcrumb.label}-${index}`} className="flex items-center gap-2">
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    {breadcrumb.to
                      ? <Link to={breadcrumb.to} className="text-slate-500 transition hover:text-violet-600 dark:text-slate-400">{breadcrumb.label}</Link>
                      : <span className="font-semibold text-slate-800 dark:text-slate-100">{breadcrumb.label}</span>}
                  </span>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-3">
                {headerActions}
                <button
                  type="button"
                  onClick={() => setIsDark(value => !value)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <NotificationBell />
                <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 dark:border-white/10 sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-400/20 dark:text-violet-200">
                    {`${user?.firstname?.[0] ?? 'O'}${user?.lastname?.[0] ?? ''}`.toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-40 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.firstname} {user?.lastname}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">Organizer</span>
                  </span>
                </div>
              </div>
            </div>
          </header>
          <main className="organizer-page-content mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
            <section>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </section>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
