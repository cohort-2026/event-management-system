import { Link } from 'react-router-dom';
import type { Event } from '@/types/event';
import Badge, { type BadgeVariant } from './Badge';

const statusVariant: Record<string, BadgeVariant> = {
  PUBLISHED:        'success',
  DRAFT:            'default',
  PENDING_APPROVAL: 'warning',
  CANCELLED:        'danger',
  COMPLETED:        'info',
};

interface EventCardProps { event: Event; }

export default function EventCard({ event }: EventCardProps) {
  const date = new Date(event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <Link to={`/events/${event.id}`} className="block group">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-neutral-900 group-hover:text-brand-600 transition-colors line-clamp-2">{event.title}</h3>
          <Badge variant={statusVariant[event.status] ?? 'default'}>{event.status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-sm text-neutral-500 line-clamp-2">{event.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-500 mt-auto">
          <span>📅 {date}</span>
          <span>📍 {event.venue}</span>
          <span>🎟 {event.isFree ? 'Free' : `R${event.price}`}</span>
          <span>👥 {event.availableCapacity} / {event.capacity} spots</span>
        </div>
      </div>
    </Link>
  );
}
