import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DashboardNavigationContext } from '@/components/layout/dashboardNavigationState';

export function DashboardNavigationProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);

  const toggle = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed(current => !current);
      return;
    }

    setMobileOpen(current => !current);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      setMobileOpen(false);
    };

    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobile();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [closeMobile, mobileOpen]);

  return (
    <DashboardNavigationContext.Provider value={{ collapsed, mobileOpen, isDesktop, toggle, closeMobile }}>
      {children}
    </DashboardNavigationContext.Provider>
  );
}
