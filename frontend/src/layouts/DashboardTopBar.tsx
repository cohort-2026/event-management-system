import type { ReactNode } from 'react';
import { useAuth } from '@/context/useAuth';
import { DashboardMenuButton } from '@/layouts/RoleDashboardSidebar';
import type { UserRole } from '@/types/user';

const roleLabels: Record<UserRole, string> = { ADMIN: 'Administrator', ORGANIZER: 'Organizer', VENDOR: 'Vendor', ATTENDEE: 'Attendee' };

export default function DashboardTopBar({ title, subtitle, actions, showMenu = false, showUser = true, compactTitle = false, className = '' }: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showMenu?: boolean;
  showUser?: boolean;
  compactTitle?: boolean;
  className?: string;
}) {
  const { user } = useAuth();
  const initials = `${user?.firstname?.[0] ?? 'E'}${user?.lastname?.[0] ?? 'M'}`.toUpperCase();
  return <header className={`sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-neutral-950/95 ${className}`}>
    {showMenu && <DashboardMenuButton label={`Open ${user ? roleLabels[user.role].toLowerCase() : 'dashboard'} navigation`} />}
    <div className="min-w-0 flex-1">
      {title && <p className={`truncate font-heading font-bold leading-tight text-neutral-950 dark:text-white ${compactTitle ? 'text-base' : 'text-lg sm:text-xl'}`}>{title}</p>}
      {subtitle && <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex min-w-0 items-center gap-2">{actions}</div>}
    {showUser && user && <div className="hidden min-w-0 items-center gap-2 border-l border-neutral-200 pl-3 sm:flex dark:border-neutral-800">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white dark:bg-orange-500">{initials}</span>
      <span className="min-w-0"><span className="block max-w-40 truncate text-xs font-semibold text-neutral-900 dark:text-white">{user.firstname} {user.lastname}</span><span className="block text-[11px] text-neutral-500">{roleLabels[user.role]}</span></span>
    </div>}
  </header>;
}
