import { BarChart3, Bell, CalendarDays, Plus, ScanLine, Store, LayoutDashboard } from 'lucide-react';
import RoleDashboardSidebar, { DashboardMenuButton, type DashboardNavItem } from '@/layouts/RoleDashboardSidebar';

const items: DashboardNavItem[] = [
  { label: 'Overview', to: '/organizer', icon: <LayoutDashboard className="size-4"/>, end: true },
  { label: 'Create event', to: '/organizer/events/new', icon: <Plus className="size-4"/>, isActive: pathname => pathname === '/organizer/events/new' },
  { label: 'My events', to: '/organizer/events', icon: <CalendarDays className="size-4"/>, isActive: pathname => pathname === '/organizer/events' || /^\/organizer\/events\/[^/]+(?:\/edit|\/registrations)?$/.test(pathname) },
  { label: 'Check-in', to: '/organizer/check-in', icon: <ScanLine className="size-4"/>, isActive: pathname => pathname === '/organizer/check-in' || /^\/organizer\/events\/[^/]+\/check-in$/.test(pathname) },
  { label: 'Vendor applications', to: '/organizer/vendors', icon: <Store className="size-4"/>, isActive: pathname => pathname === '/organizer/vendors' || pathname.endsWith('/vendors') },
  { label: 'Reports', to: '/organizer/reports', icon: <BarChart3 className="size-4"/> },
  { label: 'Notifications', to: '/organizer/notifications', icon: <Bell className="size-4"/>, isActive: pathname => pathname === '/organizer/notifications' },
];

export default function OrganizerSidebar() {
  return <>
    <DashboardMenuButton label="Open organizer navigation" className="m-3 mb-0" />
    <RoleDashboardSidebar role="ORGANIZER" items={items} profileTo="/organizer/profile" accountSubtitle="Organizer account" />
  </>;
}
