import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PlatformAdminSidebar from '@/pages/platform-admin/components/PlatformAdminSidebar';

const pageDetails: Record<string, { title: string; description: string }> = {
  '/platform-admin': {
    title: 'Platform overview',
    description: 'A clear view of administrator access and recent platform activity.',
  },
  '/platform-admin/admins': {
    title: 'Admin management',
    description: 'Provision and manage administrator access for this platform.',
  },
  '/platform-admin/settings': {
    title: 'Settings',
    description: 'Review your platform-admin account and security options.',
  },
  '/platform-admin/audit': {
    title: 'Audit history',
    description: 'A traceable record of recent privileged administrator actions.',
  },
  '/platform-admin/reports': {
    title: 'Reports',
    description: 'Operational reporting for administrator access and audit activity.',
  },
};

export default function PlatformAdminLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const page = pageDetails[pathname] ?? pageDetails['/platform-admin'];
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-neutral-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <PlatformAdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={sidebarOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <MenuIcon />
              </button>
              <div className="min-w-0">
                <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 sm:block">
                  Platform administration
                </p>
                <h1 className="truncate text-lg font-bold tracking-tight text-neutral-900 sm:mt-0.5 sm:text-xl">
                  {page.title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-neutral-800">{user?.firstname} {user?.lastname}</p>
                <p className="text-xs text-neutral-500">Platform administrator</p>
              </div>
              <div
                aria-label={`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100"
              >
                {initials || 'PA'}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-7">
            <p className="text-sm leading-6 text-neutral-500">{page.description}</p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
