import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Plus,
  Settings,
  Store,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface OrganizerNavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  activeKey: string;
  group: 'workspace' | 'account';
}

export const organizerNavigation: OrganizerNavigationItem[] = [
  { label: 'Overview', to: '/organizer/dashboard', icon: LayoutDashboard, activeKey: 'overview', group: 'workspace' },
  { label: 'My Events', to: '/organizer/events', icon: CalendarDays, activeKey: 'events', group: 'workspace' },
  { label: 'Create Event', to: '/organizer/events/create', icon: Plus, activeKey: 'create', group: 'workspace' },
  { label: 'Event Attendees', to: '/organizer/attendees', icon: Users, activeKey: 'attendees', group: 'workspace' },
  { label: 'Bookings & Reservations', to: '/organizer/bookings', icon: ClipboardList, activeKey: 'bookings', group: 'workspace' },
  { label: 'Ticket Management', to: '/organizer/tickets', icon: Ticket, activeKey: 'tickets', group: 'workspace' },
  { label: 'Vendor Applications', to: '/organizer/vendor-applications', icon: Store, activeKey: 'vendors', group: 'workspace' },
  { label: 'Event Analytics', to: '/organizer/analytics', icon: BarChart3, activeKey: 'analytics', group: 'workspace' },
  { label: 'Reports', to: '/organizer/reports', icon: FileText, activeKey: 'reports', group: 'workspace' },
  { label: 'Notifications', to: '/organizer/notifications', icon: Bell, activeKey: 'notifications', group: 'workspace' },
  { label: 'Profile Settings', to: '/organizer/settings', icon: Settings, activeKey: 'settings', group: 'account' },
  { label: 'Help & Support', to: '/organizer/help', icon: CircleHelp, activeKey: 'help', group: 'account' },
];
