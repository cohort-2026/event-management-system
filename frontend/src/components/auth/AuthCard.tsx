import type { ReactNode } from 'react';
import { CalendarDays, type LucideIcon } from 'lucide-react';

interface AuthCardProps {
  children: ReactNode;
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  width?: 'sm' | 'md';
}

export default function AuthCard({
  children,
  title,
  description,
  icon: Icon = CalendarDays,
  width = 'sm',
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f7f7f5] px-4 py-8 text-neutral-950 sm:items-center">
      <section className={`w-full ${width === 'md' ? 'max-w-[560px]' : 'max-w-[380px]'}`}>
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.35)] sm:p-7">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
              <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-950">{title}</h1>
            {description && <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}