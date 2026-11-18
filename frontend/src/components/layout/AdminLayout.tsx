import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/layout/NotificationBell';
import { useState } from 'react';

const navigation = [
  { label: 'Dashboard', path: '/admin', icon: <HomeIcon /> },
  { label: 'Organisers', path: '/admin/users/organizers', icon: <UsersIcon />, count: 2 },
  { label: 'Vendors', path: '/admin/users/vendors', icon: <StoreIcon />, count: 1 },
  { label: 'People', path: '/admin/user-accounts', icon: <UsersIcon /> },
  { label: 'Notifications', path: null, icon: <BellIcon /> },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh bg-white p-2 text-[#1f2937] antialiased sm:p-4 lg:py-8">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] max-w-[1280px] overflow-hidden rounded-xl border border-[#dfe3ea] bg-[#f7f7f6] shadow-[0_18px_38px_rgba(15,23,42,0.08)] sm:min-h-[calc(100dvh-2rem)] sm:rounded-[18px]">
        <aside className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(260px,calc(100vw-2rem))] shrink-0 flex-col border-r border-[#e5e7eb] bg-[#f7f8f8] px-3 py-4 transition-transform duration-200 lg:static lg:z-auto lg:h-auto lg:w-[220px] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#f3f4f5] px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f15d5d] text-sm font-bold text-white">E</div>
            <div className="text-[24px] font-extrabold tracking-[-0.05em] text-[#1f2937] sm:text-[29px]">EventMS</div>
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#e9ebed] lg:hidden"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-3 px-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8c93a0]">Admin</div>
          <nav aria-label="Admin navigation" className="space-y-1.5">
            {navigation.map((item) => {
              if (item.label === 'Notifications') {
                return (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#4b5563] hover:bg-[#eef1f4]">
                    <NotificationBell />
                    <span>Notifications</span>
                  </div>
                );
              }

              const isActive = item.path === '/admin'
                ? pathname === '/admin'
                : item.path !== null && (pathname === item.path || (
                  item.label !== 'Organisers' && item.label !== 'Vendors' && pathname.startsWith(`${item.path}/`)
                ));

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    disabled={!item.path}
                    onClick={() => {
                      if (item.path) navigate(item.path);
                      setSidebarOpen(false);
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
                    </span>
                  </button>
                </div>
              );
            })}
          </nav>
          </div>

          <div className="mt-auto shrink-0 pt-8">
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-5">
            <div className="mb-3 flex items-center gap-3 lg:hidden">
              <button
                type="button"
                aria-label="Open admin navigation"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dfe3ea] bg-white text-[#4b5563]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-[#4b5563]">EventMS Admin</span>
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-7.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8v-1a4 4 0 0 0-3-3.87M20 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function StoreIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 8h16l-1 11H5L4 8Zm3-3h10l1 3H6l1-3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BellIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
