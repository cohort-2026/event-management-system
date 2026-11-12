interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'purple';
  appearance?: 'default' | 'analytics';
}

const colorMap = {
  brand:   { icon: 'bg-brand-50 text-brand-600',   border: 'border-l-brand-500'   },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', border: 'border-l-emerald-500' },
  amber:   { icon: 'bg-amber-50 text-amber-600',    border: 'border-l-amber-500'   },
  rose:    { icon: 'bg-rose-50 text-rose-600',      border: 'border-l-rose-500'    },
  purple:  { icon: 'bg-purple-50 text-purple-600',  border: 'border-l-purple-500'  },
};

const analyticsColorMap = {
  brand:   { icon: 'bg-brand-50 text-brand-600', border: 'border-l-brand-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', border: 'border-l-emerald-500' },
  amber:   { icon: 'bg-amber-50 text-amber-600', border: 'border-l-amber-500' },
  rose:    { icon: 'bg-rose-50 text-rose-600', border: 'border-l-rose-500' },
  purple:  { icon: 'bg-purple-50 text-purple-600', border: 'border-l-purple-500' },
};

export default function StatCard({ label, value, sub, icon, color = 'brand', appearance = 'default' }: StatCardProps) {
  const c = appearance === 'analytics' ? analyticsColorMap[color] : colorMap[color];
  return (
    <div className={`border border-l-4 ${c.border} p-5 flex items-center gap-4 ${
      appearance === 'analytics'
        ? `dashboard-stat-card dashboard-stat-card-${color} rounded-xl border-neutral-200 shadow-sm`
        : 'bg-white rounded-xl border-neutral-200 shadow-xs'
    }`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight text-neutral-900">{value}</p>
        <p className="text-sm truncate text-neutral-500">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
