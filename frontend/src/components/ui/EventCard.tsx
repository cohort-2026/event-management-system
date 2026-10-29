import { Link } from 'react-router-dom';
import type { Event } from '@/types/event';
import Badge, { type BadgeVariant } from './Badge';

const statusVariant: Record<string, BadgeVariant> = {
  PUBLISHED: 'success', DRAFT: 'default', PENDING_APPROVAL: 'warning', REJECTED: 'danger', CANCELLED: 'danger', COMPLETED: 'info',
};

const categoryColors: Record<string, string> = {
  Technology: 'bg-brand-50 text-brand-700',
  Training: 'bg-purple-50 text-purple-700',
  Networking: 'bg-emerald-50 text-emerald-700',
  'Company Activity': 'bg-amber-50 text-amber-700',
};

export default function EventCard({ event }: { event: Event }) {
  const date = new Date(event.startTime ?? event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const catColor = categoryColors[event.category] ?? 'bg-neutral-100 text-neutral-600';
  const seatsLeft = Math.max(0, Math.min(event.capacity, event.availableCapacity));
  const fillPct = event.capacity > 0
    ? Math.min(100, Math.round(((event.capacity - seatsLeft) / event.capacity) * 100))
    : 0;
  const bookingOpen = event.bookingOpen ?? event.availableCapacity > 0;
  const bookingLabel = !bookingOpen
    ? event.availableCapacity === 0 ? event.isFree ? 'Fully booked' : 'Sold out' : 'Bookings closed'
    : `${seatsLeft} seats left`;

  return (
    <Link to={`/events/${event.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all duration-200 overflow-hidden flex flex-col h-full">
        {event.bannerImageUrl
          ? <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="h-40 w-full object-cover" />
          : <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-400" />}

        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColor}`}>
              {event.category}
            </span>
            <Badge variant={statusVariant[event.status] ?? 'default'}>
              {event.status === 'PUBLISHED' ? 'APPROVED' : event.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <h3 className="font-bold text-neutral-900 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2">
            {event.title}
          </h3>
          <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed flex-1">{event.description}</p>

          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <svg className="w-3.5 h-3.5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 01-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date} at {time}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <svg className="w-3.5 h-3.5 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-bold ${event.isFree ? 'text-emerald-600' : 'text-neutral-900'}`}>
              {event.isFree ? 'Free' : `From R${event.price ?? '—'}`}
            </span>
            <div className="flex items-center gap-2">
              {bookingOpen && (
                <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${fillPct > 80 ? 'bg-rose-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              )}
              <span className={`text-xs ${bookingOpen ? 'text-neutral-400' : 'font-semibold text-rose-600'}`}>
                {!bookingOpen ? bookingLabel : `${seatsLeft} seats left · ${fillPct}% full`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
