import { createContext, useContext } from 'react';

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
