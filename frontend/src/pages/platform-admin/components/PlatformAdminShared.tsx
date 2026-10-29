import type { ReactNode } from 'react';

export function MetricCard({ label, value, note, icon, tone }: { label: string; value: number; note: string; icon: ReactNode; tone: 'brand' | 'green' | 'amber' | 'slate' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-neutral-100 text-neutral-700',
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-neutral-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{note}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="px-6 py-12 text-center"><p className="text-sm font-semibold text-neutral-800">{title}</p><p className="mt-1 text-sm text-neutral-500">{description}</p></div>;
}

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const success = ['created', 'activated', 'success', 'successful'].includes(normalized);
  const failure = normalized.includes('fail') || normalized.includes('reject');
  const tone = success ? 'bg-emerald-50 text-emerald-700' : failure ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-600';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{value.replaceAll('_', ' ')}</span>;
}
