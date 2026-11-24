import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Building2, CalendarDays, FileText, Users } from 'lucide-react';
import NotificationBell from '@/layouts/NotificationBell';
import { useDashboardNavigation } from '@/layouts/dashboardNavigationState';
import { OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT } from '@/layouts/dashboardNavigationState';
import RoleDashboardSidebar, { DashboardMenuButton, type DashboardNavItem } from '@/layouts/RoleDashboardSidebar';
import { useVendorApplicationCount } from '@/features/vendor/hooks/useVendorApplicationCount';

export default function VendorSidebar({ accountSubtitle }: { accountSubtitle?: string }) {
  const navigation = useDashboardNavigation();
  const { count, error } = useVendorApplicationCount();
  const [notificationOpenTarget, setNotificationOpenTarget] = useState<'desktop' | 'mobile' | null>(null);
  const closeNotifications = useCallback(() => setNotificationOpenTarget(null), []);

  useEffect(() => {
    const openSidebarNotifications = () => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      if (!desktop && !navigation?.mobileOpen) navigation?.toggle();
      setNotificationOpenTarget(desktop ? 'desktop' : 'mobile');
    };
    window.addEventListener(OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT, openSidebarNotifications);
    return () => window.removeEventListener(OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT, openSidebarNotifications);
  }, [navigation]);

  const items: DashboardNavItem[] = [
    { label: 'Overview', to: '/vendor', icon: <Building2 className="size-4"/>, end: true },
    { label: 'Find events', to: '/vendor/events', icon: <CalendarDays className="size-4"/>, isActive: pathname => pathname === '/vendor/events' },
    { label: 'My applications', to: '/vendor/applications', icon: <FileText className="size-4"/>, badge: error ? '!' : count ?? '…', isActive: pathname => pathname === '/vendor/applications' || pathname.startsWith('/vendor/applications/') && !pathname.endsWith('/staff') },
    { label: 'Staff passes', to: '/vendor/staff', icon: <Users className="size-4"/>, isActive: pathname => pathname === '/vendor/staff' || pathname.endsWith('/staff') },
    { label: 'Business profile', to: '/vendor/profile', icon: <BadgeCheck className="size-4"/> },
  ];

  return <>
    <RoleDashboardSidebar role="VENDOR" items={items} profileTo="/vendor/profile" accountSubtitle={accountSubtitle}
      afterNavigation={mobile => <NotificationBell key={notificationOpenTarget === (mobile ? 'mobile' : 'desktop') ? 'open' : 'closed'} appearance="sidebar" initiallyOpen={notificationOpenTarget === (mobile ? 'mobile' : 'desktop')} onClose={closeNotifications} />} />
  </>;
}

export function VendorMenuButton() {
  return <DashboardMenuButton label="Open vendor navigation" />;
}
