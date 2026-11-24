import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  sub?: string;
  description?: string;
  icon?: ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  className?: string;
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'purple';
  appearance?: 'default' | 'analytics' | 'organizer' | 'organizer-warm' | 'organizer-blue' | 'organizer-purple' | 'organizer-dark';
}

const iconTones = {
  brand: 'bg-accent-500/10 text-accent-600',
  emerald: 'bg-success-bg text-success-text',
  amber: 'bg-warning-bg text-warning-text',
  rose: 'bg-danger-bg text-danger-text',
  purple: 'bg-secondary text-secondary-foreground',
};

export default function StatCard({ label, title, value, sub, description, icon, trend, className, color = 'brand' }: StatCardProps) {
  const heading = title ?? label ?? '';
  const detail = description ?? sub;
  return <article className={cn('flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs', className)}>
    {icon && <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', iconTones[color])}>{icon}</span>}
    <div className="min-w-0"><p className="font-heading text-2xl font-bold tracking-tight text-foreground">{value}</p><p className="truncate text-sm text-muted-foreground">{heading}</p>
      {(detail || trend) && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">{trend && <span className={trend.direction === 'up' ? 'font-semibold text-success-text' : trend.direction === 'down' ? 'font-semibold text-danger-text' : 'font-semibold text-muted-foreground'}>{trend.value}</span>}{detail && <span className="text-muted-foreground">{detail}</span>}</div>}
    </div>
  </article>;
}
