import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({ label, error, helperText, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-neutral-50 disabled:text-neutral-400
          ${error ? 'border-rose-400' : 'border-neutral-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p className="text-xs text-neutral-500">{helperText}</p>}
    </div>
  );
}
