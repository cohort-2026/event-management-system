import { useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/layout/NotificationBell';
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
    <div className="flex min-h-screen flex-col bg-[#f7f7f8] text-neutral-900 md:flex-row">
      <aside className="attendee-sidebar flex w-full shrink-0 flex-col border-b border-neutral-200 bg-white md:sticky md:top-0 md:h-screen md:w-[220px] md:border-b-0 md:border-r">
        <div className="flex h-16 items-center gap-2.5 border-b border-neutral-200 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
            <svg {...iconProps} className="h-4 w-4"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
          </span>
          <span className="text-base font-bold tracking-tight text-black">EventMS</span>
        </div>

        <p className="px-4 pb-2 pt-4 text-[10px] font-medium uppercase tracking-wider text-black">Attendee</p>
        <nav aria-label="Attendee" className="flex flex-col gap-0.5 px-2.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                  isActive ? 'bg-red-50 font-semibold text-black' : 'attendee-nav-hover text-black'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 p-2.5">
          <div className="attendee-nav-hover attendee-profile flex items-center gap-2.5 rounded-lg border border-neutral-200 p-2 transition-colors">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
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
            style={{
              backgroundImage:
                'radial-gradient(circle at 80% 15%, #9b1b3a 0%, rgba(155,27,58,0.55) 35%, transparent 70%),' +
                'linear-gradient(to right, transparent calc(50% - 0.5px), rgba(192,49,79,0.35) calc(50% - 0.5px) calc(50% + 0.5px), transparent calc(50% + 0.5px)),' +
                'linear-gradient(to bottom, transparent calc(50% - 0.5px), rgba(192,49,79,0.35) calc(50% - 0.5px) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-black px-3 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:px-6">
          <p style={{ color: '#000' }} className="min-w-0 truncate text-[36px] font-semibold leading-none text-black">
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
