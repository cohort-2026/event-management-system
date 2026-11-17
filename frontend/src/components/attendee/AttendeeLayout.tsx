import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/layout/NotificationBell';
import { useAuth } from '@/context/useAuth';

interface AttendeeLayoutProps {
  children: ReactNode;
  mainClassName?: string;
}

export default function AttendeeLayout({
  children,
  mainClassName = 'mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6',
}: AttendeeLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const initials = `${user?.firstname?.charAt(0) ?? 'A'}${user?.lastname?.charAt(0) ?? 'T'}`;

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <nav aria-label="Main" className="mx-auto flex min-h-14 max-w-[1440px] items-center gap-5 px-4 sm:px-6">
          <Link to="/attendee" className="flex shrink-0 items-center gap-2" aria-label="EventMS home">
            <img src="/eventms-logo.png" alt="" className="h-7 w-7 rounded-md object-cover" />
            <span className="text-sm font-extrabold tracking-tight text-black">EventMS</span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
            <NavLink to="/attendee" end style={{ color: '#000000' }} className={({ isActive }) => navLinkClass(isActive)}>
              Discover
            </NavLink>
            <NavLink to="/attendee/bookings" style={{ color: '#000000' }} className={({ isActive }) => navLinkClass(isActive)}>
              Calendar
            </NavLink>
            <Link to="/register" style={{ color: '#000000' }} className={navLinkClass(false)}>For organisers</Link>
            <Link to="/register" style={{ color: '#000000' }} className={navLinkClass(false)}>For vendors</Link>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <NavLink
              to="/attendee/tickets"
              className="text-xs font-semibold text-black transition-colors hover:text-black"
            >
              My tickets
            </NavLink>
            <NotificationBell compact />
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                aria-label={`Account menu for ${user?.firstname ?? 'attendee'}`}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen(open => !open)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
              >
                {initials}
              </button>
              {accountOpen && (
                <div role="menu" aria-label="Account" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-neutral-100 px-2 pb-2">
                    <p className="truncate text-xs font-semibold text-black">
                      {user ? `${user.firstname} ${user.lastname}` : 'Attendee'}
                    </p>
                    {user?.email && <p className="mt-0.5 truncate text-[10px] text-black">{user.email}</p>}
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loggingOut}
                    onClick={() => void handleLogout()}
                    className="mt-1 w-full rounded-md px-2 py-2 text-left text-xs font-semibold text-black hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {loggingOut ? 'Logging out…' : 'Log out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
      <main className={mainClassName}>{children}</main>
    </div>
  );
}

function navLinkClass(active: boolean) {
  return `rounded-md px-3 py-2 text-[11px] font-medium text-black transition-colors ${active ? 'bg-neutral-100' : 'hover:bg-neutral-100'}`;
}
