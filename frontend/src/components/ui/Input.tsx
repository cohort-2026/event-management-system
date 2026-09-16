import { useState, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
}

export default function Input({ label, error, helperText, showPasswordToggle = false, id, className = '', type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400
            shadow-xs transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
            ${showPasswordToggle && isPassword ? 'pr-11' : ''}
            ${error ? 'border-rose-400 focus:ring-rose-400' : 'border-neutral-200 hover:border-neutral-300'}
            ${className}`}
          {...props}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            aria-label={showPassword ? `Hide ${label?.toLowerCase() ?? 'password'}` : `Show ${label?.toLowerCase() ?? 'password'}`}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-700 focus:outline-none focus:text-brand-600"
          >
            {showPassword ? (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18M10.584 10.587a2 2 0 002.829 2.828M9.88 5.09A9.77 9.77 0 0112 4.875c5.25 0 9 5.625 9 7.125a11.36 11.36 0 01-2.025 3.01m-3.09 2.088A9.77 9.77 0 0112 19.125c-5.25 0-9-5.625-9-7.125 0-1.04 1.73-3.69 4.603-5.496" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12 18.25 18.75 12 18.75 2.25 12 2.25 12z" />
                <circle cx="12" cy="12" r="2.75" strokeWidth={1.8} />
              </svg>
            )}
          </button>
        )}
      </div>
      {error     && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-neutral-400">{helperText}</p>}
    </div>
  );
}
