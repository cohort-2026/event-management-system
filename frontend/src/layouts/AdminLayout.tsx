import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BarChart3, ClipboardList, LayoutDashboard, Store, Users } from 'lucide-react';
import NotificationBell from '@/layouts/NotificationBell';
import DashboardTopBar from '@/layouts/DashboardTopBar';
import RoleDashboardSidebar, { type DashboardNavItem } from '@/layouts/RoleDashboardSidebar';
import { DashboardNavigationProvider } from '@/layouts/DashboardNavigationContext';
import { getOrganizers } from '@/features/organizer/services/organizerService';
import { getPendingVendorProfiles } from '@/features/vendor/services/vendorService';

function AdminLayoutContent() {
  const { pathname } = useLocation();
  const [pendingCounts, setPendingCounts] = useState({ organizers: 0, vendors: 0 });

  useEffect(() => {
    let active = true;
    Promise.all([getOrganizers(), getPendingVendorProfiles()])
      .then(([organizers, vendors]) => {
        if (!active) return;
        setPendingCounts({
          organizers: organizers.data.data.filter(person => person.profileApprovalStatus === 'PENDING_APPROVAL' && person.isActive).length,
          vendors: vendors.data.data.filter(profile => profile.user.isActive).length,
        });
      })
      .catch(() => { if (active) setPendingCounts({ organizers: 0, vendors: 0 }); });
    return () => { active = false; };
  }, []);

  const items: DashboardNavItem[] = [
    { label: 'Overview', to: '/admin', icon: <LayoutDashboard className="size-4"/>, end: true },
    { label: 'Organizers', to: '/admin/users/organizers/pending', icon: <Users className="size-4"/>, badge: pendingCounts.organizers, isActive: path => path.startsWith('/admin/users/organizers') },
    { label: 'Vendor profiles', to: '/admin/users/vendors/pending', icon: <Store className="size-4"/>, badge: pendingCounts.vendors, isActive: path => path.startsWith('/admin/users/vendors') },
    { label: 'People', to: '/admin/user-accounts', icon: <Users className="size-4"/> },
    { label: 'Reports', to: '/admin/reports', icon: <BarChart3 className="size-4"/> },
    { label: 'Audit history', to: '/admin/audit', icon: <ClipboardList className="size-4"/> },
  ];
  const title = pathname === '/admin' ? 'Overview'
    : pathname.startsWith('/admin/users/organizers') ? 'Organizer approvals'
      : pathname.startsWith('/admin/users/vendors') ? 'Vendor profile approvals'
        : pathname.startsWith('/admin/user-accounts') ? 'People'
          : pathname.startsWith('/admin/reports') ? 'Reports' : 'Audit history';

  return <div className="flex min-h-screen bg-stone-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
    <RoleDashboardSidebar role="ADMIN" items={items}/>
    <div className="flex min-w-0 flex-1 flex-col">
      <DashboardTopBar title={title} subtitle="EventMS administration" showMenu actions={pathname === '/admin' ? undefined : <NotificationBell />} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}

export default function AdminLayout() {
  return <DashboardNavigationProvider><AdminLayoutContent /></DashboardNavigationProvider>;
}
