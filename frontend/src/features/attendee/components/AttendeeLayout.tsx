import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import NotificationBell from '@/layouts/NotificationBell';
import { useAuth } from '@/context/useAuth';

interface AttendeeLayoutProps {
  children: ReactNode;
  mainClassName?: string;
}

const iconProps = {
  className: 'h-4 w-4 shrink-0',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const navItems = [
  {
    label: 'Overview',
    to: '/attendee',
    end: true,
    icon: <svg {...iconProps}><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></svg>,
  },
  {
    label: 'My bookings',
    to: '/attendee/bookings',
    end: true,
    icon: <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>,
  },
  {
    label: 'All events',
    to: '/events',
    end: false,
    icon: <svg {...iconProps}><path d="M12 5v14M5 12h14" /></svg>,
  },
  {
    label: 'Ticket',
    to: '/attendee/tickets',
    end: false,
    icon: <svg {...iconProps}><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  },
];

export default function AttendeeLayout({
  children,
  mainClassName = 'mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6',
}: AttendeeLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [query, setQuery] = useState('');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/events?search=${encodeURIComponent(term)}` : '/events');
  };
  const initials = `${user?.firstname?.charAt(0) ?? 'A'}${user?.lastname?.charAt(0) ?? 'T'}`.toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-neutral-900 md:flex-row dark:bg-neutral-950 dark:text-white">
      <aside className="attendee-sidebar flex w-full shrink-0 flex-col border-b border-neutral-200 bg-white md:fixed md:inset-y-0 md:left-0 md:h-dvh md:w-[240px] md:overflow-y-auto md:border-b-0 md:border-r dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex h-16 items-center gap-2.5 border-b border-neutral-200 px-4 dark:border-neutral-800">
          <img src="/attendee-dashboard-logo.png" alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
          <span className="text-base font-bold tracking-tight text-black">EventMS</span>
        </div>

        <p className="hidden px-4 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 md:block">Your space</p>
        <nav aria-label="Attendee" className="flex gap-1 overflow-x-auto px-2.5 pb-2 md:flex-col md:overflow-visible">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 md:w-full ${
                  isActive ? 'bg-orange-50 font-semibold text-orange-900 dark:bg-orange-950/50 dark:text-orange-200' : 'attendee-nav-hover text-neutral-600 dark:text-neutral-300'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 p-2.5 md:p-3">
          <div className="attendee-nav-hover attendee-profile hidden items-center gap-2.5 rounded-xl border border-neutral-200 p-2.5 transition-colors dark:border-neutral-700 md:flex">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate               text-xs font-semibold text-black">
                {user ? `${user.firstname} ${user.lastname}` : 'Attendee'}
              </p>
                            <p className="truncate text-[10px] text-black">{user?.email ?? 'Attendee'}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-neutral-950 px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60 md:mx-0 md:max-w-none dark:bg-white dark:text-neutral-950"
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:ml-[240px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-neutral-950/95">
          <p className="min-w-0 truncate font-heading text-xl font-bold leading-none tracking-tight text-neutral-950 sm:text-2xl dark:text-white">
            {greeting}{user?.firstname ? `, ${user.firstname}` : ''}
          </p>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
            <form role="search" onSubmit={handleSearch} className="relative w-full max-w-xs">
              <svg {...iconProps} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search events"
                aria-label="Search events"
                className="h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-red-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </form>
            <NotificationBell compact />
          </div>
        </header>
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}
