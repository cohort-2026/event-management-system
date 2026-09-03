import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/user';

const roleLinks: Record<UserRole, { label: string; to: string }[]> = {
  ATTENDEE:      [{ label: 'Events', to: '/events' }],
  ORGANIZER:     [{ label: 'Events', to: '/events' }, { label: 'Dashboard', to: '/organizer' }],
  VENDOR:        [{ label: 'Events', to: '/events' }, { label: 'Dashboard', to: '/vendor' }],
  ADMIN:         [{ label: 'Events', to: '/events' }, { label: 'Admin', to: '/admin' }],
  PLATFORM_ADMIN:[{ label: 'Settings', to: '/platform-admin/settings' }],
  MANAGEMENT:    [{ label: 'Reports', to: '/management/reports' }],
};

export default function Navbar() {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = user ? (roleLinks[user.role] ?? []) : [];
  const handleLogout = () => { clearAuth(); navigate('/login'); };
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="page-container flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="font-bold text-brand-600 text-lg tracking-tight shrink-0">
          EventMS
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm text-neutral-600 hover:text-brand-600 transition-colors">
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-500">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-rose-500 hover:text-rose-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={closeMenu}
              className="text-sm text-neutral-700 hover:text-brand-600 py-1 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <span className="text-sm text-neutral-500">{user.name}</span>
              <button
                onClick={() => { handleLogout(); closeMenu(); }}
                className="text-sm text-rose-500 hover:text-rose-700 text-left transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={closeMenu} className="text-sm font-medium text-brand-600">
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
