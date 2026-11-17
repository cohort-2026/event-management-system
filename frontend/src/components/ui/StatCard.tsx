interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'purple';
  appearance?: 'default' | 'analytics' | 'organizer' | 'organizer-warm' | 'organizer-blue' | 'organizer-purple' | 'organizer-dark';
}

const colorMap = {
  brand:   { icon: 'bg-brand-50 text-brand-600',   border: 'border-l-brand-500'   },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', border: 'border-l-emerald-500' },
  amber:   { icon: 'bg-amber-50 text-amber-600',    border: 'border-l-amber-500'   },
  rose:    { icon: 'bg-rose-50 text-rose-600',      border: 'border-l-rose-500'    },
  purple:  { icon: 'bg-purple-50 text-purple-600',  border: 'border-l-purple-500'  },
};

const analyticsColorMap = {
  brand:   { icon: 'bg-white/15 text-white', border: 'border-l-fuchsia-400' },
  emerald: { icon: 'bg-white/15 text-white', border: 'border-l-cyan-300' },
  amber:   { icon: 'bg-white/15 text-white', border: 'border-l-amber-300' },
  rose:    { icon: 'bg-white/15 text-white', border: 'border-l-pink-300' },
  purple:  { icon: 'bg-white/15 text-white', border: 'border-l-violet-300' },
};

const organizerGradients: Partial<Record<NonNullable<StatCardProps['appearance']>, string>> = {
  'organizer-warm': 'from-[#d81935] to-[#c2410c]',
  'organizer-blue': 'from-[#0870b6] to-[#3456c5]',
  'organizer-purple': 'from-[#8b20b3] to-[#bb287b]',
  'organizer-dark': 'from-[#141016] via-[#8d102d] to-[#141016]',
};

export default function StatCard({ label, value, sub, icon, color = 'brand', appearance = 'default' }: StatCardProps) {
  const organizerGradient = organizerGradients[appearance];
  const lightText = appearance === 'analytics' || organizerGradient;
  const c = organizerGradient
    ? { icon: 'bg-white/15 text-white', border: 'border-transparent' }
    : appearance === 'analytics'
    ? analyticsColorMap[color]
    : appearance === 'organizer'
      ? { icon: 'bg-[#123456] text-white', border: 'border-l-orange-600' }
      : colorMap[color];
  return (
    <div className={`border border-l-4 ${c.border} p-5 flex items-center gap-4 ${
      organizerGradient
        ? `rounded-xl shadow-sm bg-gradient-to-br ${organizerGradient}`
        : appearance === 'analytics'
        ? `dashboard-stat-card dashboard-stat-card-${color} rounded-xl border-white/10 shadow-lg shadow-black/15`
        : 'bg-white rounded-xl border-neutral-200 shadow-xs'
    }`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold tracking-tight ${lightText ? 'text-white' : 'text-neutral-900'}`}>{value}</p>
        <p className={`text-sm truncate ${organizerGradient ? 'text-white' : appearance === 'analytics' ? 'text-white/75' : 'text-neutral-500'}`}>{label}</p>
        {sub && <p className={`mt-0.5 text-xs ${organizerGradient ? 'text-white' : appearance === 'analytics' ? 'text-white/60' : 'text-neutral-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}
