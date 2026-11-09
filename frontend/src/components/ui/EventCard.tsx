import { Link } from 'react-router-dom';
import type { Event } from '@/types/event';

const categoryColors: Record<string, string> = {
  Technology:       'bg-brand-50 text-brand-700',
  Training:         'bg-purple-50 text-purple-700',
  Networking:       'bg-emerald-50 text-emerald-700',
  'Company Activity': 'bg-amber-50 text-amber-700',
};

export default function EventCard({ event, vendorView = false, vendorApproved = false }: { event: Event; vendorView?: boolean; vendorApproved?: boolean }) {
  const date = new Date(event.startTime ?? event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = new Date(event.startTime).toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit' });
  const applicationsOpen = event.status === 'PUBLISHED' && new Date(event.startTime) > new Date();
  const catColor = categoryColors[event.category] ?? 'bg-neutral-100 text-neutral-600';
  const filled = event.capacity - event.availableCapacity;
  const fillPct = Math.round((filled / event.capacity) * 100);

  return (
    <Link to={`/events/${event.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all duration-200 overflow-hidden flex flex-col h-full">
        {event.bannerImageUrl
          ? <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="h-40 w-full object-cover" />
          : <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-400" />}

        <div className="p-5 flex flex-col gap-3 flex-1">
          <div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColor}`}>
              {event.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-neutral-900 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed flex-1">{event.description}</p>

          {/* Meta */}
          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <svg className="w-3.5 h-3.5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date} at {time}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <svg className="w-3.5 h-3.5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          {vendorView && (
            <p className={`text-xs font-semibold ${applicationsOpen ? 'text-emerald-700' : 'text-neutral-500'}`}>
              {!applicationsOpen
                ? 'Vendor applications closed'
                : event.availableVendorStands === 0
                  ? 'No vendor stands available'
                  : vendorApproved
                    ? `${event.availableVendorStands} vendor stand${event.availableVendorStands === 1 ? '' : 's'} available`
                    : 'Approval required to apply'}
            </p>
          )}

          {/* Price + capacity */}
          <div className="flex items-center justify-between">
            {!vendorView && (
              <span className={`text-sm font-bold ${event.isFree ? 'text-emerald-600' : 'text-neutral-900'}`}>
                {event.isFree ? 'Free' : `From R${event.price ?? '—'}`}
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${fillPct > 80 ? 'bg-rose-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <span className="text-xs text-neutral-400">{event.availableCapacity} left</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
