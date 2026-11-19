import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'brand';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed gap-2';
const imageHover = 'hover:-translate-y-0.5 hover:bg-[radial-gradient(ellipse_at_70%_15%,#9d174d_0%,#3b0b20_48%,#050505_100%)] hover:text-white hover:shadow-[0_4px_14px_rgba(157,23,77,0.4)]';

const variants: Record<Variant, string> = {
  primary:   'bg-[radial-gradient(ellipse_at_70%_15%,#9d174d_0%,#3b0b20_48%,#050505_100%)] text-white shadow-sm',
  secondary: 'bg-white text-neutral-700 border border-neutral-200 shadow-xs',
  danger:    'bg-[radial-gradient(ellipse_at_70%_15%,#9d174d_0%,#3b0b20_48%,#050505_100%)] text-white shadow-sm',
  ghost:     'text-neutral-600',
  outline:   'border border-brand-600 text-brand-600',
  brand:     'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary', size = 'md', loading = false,
  disabled, children, className = '', ...props
}: ButtonProps) {
  const hoverStyle = variant === 'brand' ? '' : imageHover;

  return (
    <button
      className={`${base} ${hoverStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
