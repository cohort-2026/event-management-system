import { Link } from 'react-router-dom';
import type { Event } from '@/types/event';

const categoryThemes: Record<string, { banner: string; accent: string }> = {
  Technology: { banner: 'from-sky-600 via-blue-600 to-indigo-700', accent: 'border-sky-300' },
  Training: { banner: 'from-violet-600 via-purple-600 to-fuchsia-700', accent: 'border-violet-300' },
  Workshop: { banner: 'from-orange-500 via-rose-500 to-pink-600', accent: 'border-orange-300' },
  Networking: { banner: 'from-emerald-600 via-teal-600 to-cyan-700', accent: 'border-emerald-300' },
  'Company Activities': { banner: 'from-amber-500 via-orange-500 to-red-600', accent: 'border-amber-300' },
  'Company Activity': { banner: 'from-amber-500 via-orange-500 to-red-600', accent: 'border-amber-300' },
  other: { banner: 'from-fuchsia-600 via-pink-600 to-rose-600', accent: 'border-fuchsia-300' },
};

export default function EventCard({ event, vendorView = false, vendorApproved = false, vendorPublicView = false }: { event: Event; vendorView?: boolean; vendorApproved?: boolean; vendorPublicView?: boolean }) {
  const date = new Date(event.startTime ?? event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = new Date(event.startTime).toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit' });
  const applicationsOpen = event.status === 'PUBLISHED' && new Date(event.startTime) > new Date();
  const theme = categoryThemes[event.category] ?? { banner: 'from-indigo-600 via-blue-600 to-cyan-600', accent: 'border-indigo-300' };
  const filled = event.capacity - event.availableCapacity;
  const ticketFillPct = Math.max(0, Math.min(100, Math.round((filled / event.capacity) * 100)));
  const vendorFillPct = event.vendorStandsAvailable > 0
    ? Math.max(0, Math.min(100, Math.round(((event.vendorStandsAvailable - event.availableVendorStands) / event.vendorStandsAvailable) * 100)))
    : 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <div className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-neutral-200 border-t-4 ${theme.accent} bg-white shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg`}>
        <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${theme.banner}`}>
          {event.bannerImageUrl && <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
          <div className={`absolute inset-0 ${event.bannerImageUrl ? 'bg-gradient-to-r from-black/50 via-black/15 to-transparent' : ''}`} />
          {!event.bannerImageUrl && <>
            <span className="absolute -right-5 -top-10 h-36 w-36 rounded-full border-[18px] border-white/15" />
            <span className="absolute right-20 -bottom-12 h-28 w-28 rounded-full bg-white/10" />
            <span className="absolute -left-8 -bottom-14 h-32 w-32 rounded-full bg-black/10" />
          </>}
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-neutral-800 shadow-sm">{event.category}</span>
          {vendorView && <span className="absolute right-4 top-4 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950 shadow-sm">Vendor event</span>}
          <span className="absolute bottom-3 left-4 text-sm font-bold text-white drop-shadow">{date} · {time}</span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">

          {/* Title */}
          <h3 className="font-bold text-neutral-900 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed flex-1">{event.description}</p>

          {/* Meta */}
          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <svg className="w-3.5 h-3.5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          {vendorView && (
            <p className={`rounded-lg px-3 py-2 text-xs font-bold ${applicationsOpen && event.availableVendorStands > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {!applicationsOpen
                ? 'Vendor applications closed'
                : event.availableVendorStands === 0
                  ? 'No vendor stands available'
                  : vendorApproved
                    ? `${event.availableVendorStands} vendor stand${event.availableVendorStands === 1 ? '' : 's'} available`
                    : vendorPublicView
                      ? `${event.availableVendorStands} vendor stand${event.availableVendorStands === 1 ? '' : 's'} available`
                      : 'Approval required to apply'}
            </p>
          )}

          {/* Price + capacity */}
          <div className="flex items-center justify-between">
            {!vendorView && (
              <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${event.isFree ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {event.isFree ? 'Free' : `From R${event.price ?? '—'}`}
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full transition-[width] ${vendorView ? 'bg-amber-500' : ticketFillPct > 80 ? 'bg-rose-500' : ticketFillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${vendorView ? vendorFillPct : ticketFillPct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-neutral-500">{vendorView ? `${event.availableVendorStands} stands left` : `${event.availableCapacity} tickets left`}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
