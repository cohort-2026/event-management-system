import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { label: 'Overview', to: '/platform-admin', icon: GridIcon },
  { label: 'Admin management', to: '/platform-admin/admins', icon: UsersIcon },
  { label: 'Settings', to: '/platform-admin/settings', icon: SettingsIcon },
  { label: 'Audits', to: '/platform-admin/audit', icon: ShieldIcon },
  { label: 'Reports', to: '/platform-admin/reports', icon: ChartIcon },
];

interface PlatformAdminSidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export default function PlatformAdminSidebar({ open, onNavigate }: PlatformAdminSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-neutral-950 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <ShieldIcon />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">EventMS</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Platform console</p>
        </div>
        <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
          Admin
        </span>
      </div>

      <nav aria-label="Platform admin navigation" className="flex-1 space-y-1 px-3 py-7">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Workspace</p>
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${
                    isActive ? 'bg-accent-400' : 'bg-transparent'
                  }`}
                />
                <span className={isActive ? 'text-accent-400' : 'text-neutral-500 group-hover:text-neutral-300'}>
                  <Icon />
                </span>
                <span>{label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-white/[0.04] p-3">
          <LockIcon />
          <div>
            <p className="text-xs font-semibold text-neutral-200">Restricted workspace</p>
            <p className="mt-1 text-[11px] leading-4 text-neutral-500">Platform operations and access governance</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-neutral-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function GridIcon() {
  return <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>;
}
function UsersIcon() {
  return <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M10 11a4 4 0 100-8 4 4 0 000 8zm7-7.87a4 4 0 010 7.75" /></svg>;
}
function SettingsIcon() {
  return <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 00-1.78.48l-.06.07h-3.4l-.03-.09a1.7 1.7 0 00-1.39-1.17l-.1-.01-1.7-2.94.06-.07A1.7 1.7 0 008 14.3v-.1H4.6v-3.4l.09-.03a1.7 1.7 0 001.17-1.39l.01-.1 2.94-1.7.07.06A1.7 1.7 0 0010.7 7h.1V3.6h3.4l.03.09a1.7 1.7 0 001.39 1.17l.1.01 1.7 2.94-.06.07A1.7 1.7 0 0017 9.3v.1h3.4v3.4l-.09.03A1.7 1.7 0 0019.14 14.2l-.01.1L19.4 15z" /></svg>;
}
function ShieldIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 3l8 3v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12l2 2 4-4" /></svg>;
}
function ChartIcon() {
  return <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6m4 6V4" /></svg>;
}
function LockIcon() {
  return <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 10V7a5 5 0 0110 0v3m-12 0h14v11H5V10z" /></svg>;
}
function LogoutIcon() {
  return <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" /></svg>;
}
