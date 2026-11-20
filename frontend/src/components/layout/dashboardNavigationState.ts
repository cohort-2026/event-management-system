import { createContext, useContext } from 'react';

export const OPEN_VENDOR_SIDEBAR_NOTIFICATIONS_EVENT = 'vendor:open-sidebar-notifications';

export interface DashboardNavigationState {
  collapsed: boolean;
  mobileOpen: boolean;
  isDesktop: boolean;
  toggle: () => void;
  closeMobile: () => void;
}

export const DashboardNavigationContext = createContext<DashboardNavigationState | null>(null);

export function useDashboardNavigation() {
  return useContext(DashboardNavigationContext);
}
