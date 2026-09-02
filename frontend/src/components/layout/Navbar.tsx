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

  const links = user ? (roleLinks[user.role] ?? []) : [];

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-indigo-600 text-lg tracking-tight">EventMS</Link>
      <div className="flex items-center gap-4">
        {links.map(l => (
          <Link key={l.to} to={l.to} className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            {l.label}
          </Link>
        ))}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
