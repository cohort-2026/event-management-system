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
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-stone-50 px-4 py-8 text-neutral-950 sm:items-center dark:bg-neutral-950 dark:text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-900/20" />
      <section className={`w-full ${width === 'md' ? 'max-w-[560px]' : 'max-w-[380px]'}`}>
        <div className="relative rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-900/5 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <a href="/landing" aria-label="EventMS home" className="mb-6 flex items-center justify-center gap-2 text-sm font-bold text-neutral-700 hover:text-orange-700 dark:text-neutral-200"><span className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white"><CalendarDays className="size-4"/></span>EventMS</a>
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">{title}</h1>
            {description && <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{description}</p>}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
