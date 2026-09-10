import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Textarea({ label, error, helperText, id, className = '', ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-semibold text-neutral-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={4}
        className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y bg-white transition-colors placeholder:text-neutral-400
          ${error ? 'border-rose-400' : 'border-neutral-300 hover:border-brand-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {!error && helperText && <p className="text-xs text-neutral-500">{helperText}</p>}
    </div>
  );
}
