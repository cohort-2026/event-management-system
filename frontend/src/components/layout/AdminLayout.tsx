import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { label: 'Dashboard', path: '/admin', icon: <HomeIcon /> },
  { label: 'Awaiting Approval', path: '/admin/approvals', icon: <ListIcon />, count: 3 },
  { label: 'Organisers', path: '/admin/users/organizers', icon: <UsersIcon />, count: 2 },
  { label: 'Vendors', path: '/admin/users/vendors', icon: <StoreIcon />, count: 1 },
  { label: 'People', path: '/admin/user-accounts', icon: <UsersIcon /> },
  { label: 'Reports', path: null, icon: <ReportIcon /> },
  { label: 'Audit history', path: '/admin/audit', icon: <ShieldIcon /> },
  { label: 'Notifications', path: null, icon: <BellIcon /> },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [awaitingOpen, setAwaitingOpen] = useState(
    pathname === '/admin/approvals' || pathname.includes('/pending'),
  );
  const pageTitle = pathname.startsWith('/admin/users/vendors')
    ? 'Vendors'
    : pathname.startsWith('/admin/users/organizers')
      ? 'Organisers'
      : pathname.startsWith('/admin/user-accounts')
        ? 'People'
        : pathname.startsWith('/admin/audit')
          ? 'Audit history'
          : pathname.startsWith('/admin/accounts')
            ? 'Administrator accounts'
            : pathname.startsWith('/admin/approvals')
              ? 'Awaiting Approval'
              : 'Dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#dde3e7] px-4 py-8 text-[#1f2937] antialiased">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1280px] overflow-hidden rounded-[18px] border border-[#dfe3ea] bg-[#f7f7f6] shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#e5e7eb] bg-[#f7f8f8] px-3 py-4">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#f3f4f5] px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f15d5d] text-sm font-bold text-white">E</div>
            <div className="text-[29px] font-extrabold tracking-[-0.05em] text-[#1f2937]">EventMS</div>
          </div>

          <div className="mb-3 px-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8c93a0]">Admin</div>
          <nav aria-label="Admin navigation" className="space-y-1.5">
            {navigation.map((item) => {
              const isAwaiting = item.label === 'Awaiting Approval';
              const isActive = item.path === '/admin'
                ? pathname === '/admin'
                : item.label === 'Awaiting Approval'
                  ? pathname === '/admin/approvals' || pathname.includes('/pending')
                      : item.path !== null && (pathname === item.path || (
                        item.label !== 'Organisers' && item.label !== 'Vendors' && pathname.startsWith(`${item.path}/`)
                      ));

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    disabled={!item.path}
                    onClick={() => {
                      if (isAwaiting) setAwaitingOpen((open) => !open);
                      if (item.path) navigate(item.path);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] ${
                      isActive ? 'bg-[#f0e7ee] text-[#1f2937] shadow-inner shadow-[#efe2eb]' : 'text-[#4b5563] hover:bg-[#eef1f4] disabled:cursor-default'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`flex h-4 w-4 items-center justify-center ${isActive ? 'text-[#d14d74]' : 'text-[#6b7280]'}`}>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {item.count && <span className="min-w-[18px] rounded-full bg-[#f7dfe4] px-1.5 py-0.5 text-center text-[11px] font-bold text-[#d14d74]">{item.count}</span>}
                      {isAwaiting && <span className="text-[10px] font-bold text-[#687280]">{awaitingOpen ? '▾' : '▸'}</span>}
                    </span>
                  </button>
                  {isAwaiting && awaitingOpen && (
                    <div className="ml-6 space-y-1 rounded-lg border border-[#e7e9ed] bg-white/80 p-1.5">
                      <SubLink label="Organizers Requests" active={pathname === '/admin/users/organizers/pending'} onClick={() => navigate('/admin/users/organizers/pending')} />
                      <SubLink label="Vendors Requests" active={pathname === '/admin/users/vendors/pending'} onClick={() => navigate('/admin/users/vendors/pending')} />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#cfe9f8] text-[13px] font-bold text-[#24517d]">
                {user ? `${user.firstname.charAt(0)}${user.lastname.charAt(0)}` : 'A'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-[#1f2937]">{user ? `${user.firstname} ${user.lastname}` : 'Administrator'}</div>
                <div className="truncate text-[12px] text-[#6b7280]">Administrator</div>
              </div>
            </div>
            <button type="button" onClick={() => void handleLogout()} className="mt-3 w-full rounded-xl border border-[#e7c5c5] bg-[#fff7f7] px-3 py-2 text-[13px] font-semibold text-[#ad3a4a] hover:bg-[#fff1f2]">
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center border-b border-[#e6e8eb] bg-[#f2f4f5] px-5">
            <span className="text-[14px] font-semibold text-[#5a6470]">{pageTitle}</span>
          </header>
          <main className="min-w-0 flex-1 overflow-auto p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SubLink({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px] font-medium ${
        active ? 'bg-[#f4dfe7] text-[#1f2937]' : 'text-[#4b5563] hover:bg-[#f4f5f7] hover:text-[#1f2937]'
      }`}
    >
      {label}
    </button>
  );
}

function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-7.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ListIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" /></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8v-1a4 4 0 0 0-3-3.87M20 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function StoreIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 8h16l-1 11H5L4 8Zm3-3h10l1 3H6l1-3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ReportIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M7 18V9m5 9V5m5 13v-7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 3 5 6v5c0 5 3.4 8.6 7 10 3.6-1.4 7-5 7-10V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BellIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
