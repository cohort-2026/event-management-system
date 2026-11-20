export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-emerald-50  text-emerald-700',
  warning: 'bg-amber-50    text-amber-700',
  danger:  'bg-rose-50     text-rose-700',
  info:    'bg-sky-50      text-sky-700',
  purple:  'bg-purple-50   text-purple-700',
  amber:   'bg-amber-100   text-amber-700',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
