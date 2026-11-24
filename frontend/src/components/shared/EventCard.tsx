import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, ArrowUpRight } from 'lucide-react';
import type { Event } from '@/types/event';

export default function EventCard({ event, vendorView = false, vendorApproved = false, vendorPublicView = false }: { event: Event; vendorView?: boolean; vendorApproved?: boolean; vendorPublicView?: boolean }) {
  const date = new Date(event.startTime ?? event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = new Date(event.startTime).toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit' });
  const applicationsOpen = event.status === 'PUBLISHED' && new Date(event.startTime) > new Date();
  const fillPct = event.capacity > 0 ? Math.min(100, Math.max(0, Math.round(((event.capacity - event.availableCapacity) / event.capacity) * 100))) : 0;
  return <Link to={`/events/${event.id}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-orange-300 group-hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      {event.bannerImageUrl ? <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="aspect-[16/9] w-full object-cover"/> : <div className="flex aspect-[16/9] items-end bg-gradient-to-br from-stone-900 via-neutral-800 to-orange-950 p-5"><span className="font-heading text-2xl font-bold text-white">EventMS</span></div>}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="w-fit rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-200">{event.category}</span>
        <h3 className="line-clamp-2 font-heading font-bold leading-snug text-neutral-900 transition-colors group-hover:text-orange-700 dark:text-white">{event.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{event.description}</p>
        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <div className="flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-orange-600"/>{date} at {time}</div>
          <div className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-3.5 shrink-0 text-orange-600"/><span className="truncate">{event.venue}</span></div>
        </div>
        {vendorView && <p className={`text-xs font-semibold ${applicationsOpen ? 'text-emerald-700' : 'text-neutral-500'}`}>{!applicationsOpen ? 'Vendor applications closed' : event.availableVendorStands === 0 ? 'No vendor stands available' : vendorApproved || vendorPublicView ? `${event.availableVendorStands} vendor stand${event.availableVendorStands === 1 ? '' : 's'} available` : 'Approval required to apply'}</p>}
        <div className="flex items-center justify-between gap-2"><span className={`text-sm font-bold ${event.isFree ? 'text-emerald-700' : 'text-neutral-900 dark:text-white'}`}>{vendorView ? '' : event.isFree ? 'Free' : `From R${event.price ?? '—'}`}</span><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"><div className={`h-full rounded-full ${fillPct > 80 ? 'bg-rose-500' : 'bg-orange-500'}`} style={{width:`${fillPct}%`}}/></div><span className="text-xs text-neutral-500">{event.availableCapacity} left</span></div></div>
        <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800"><span className="font-semibold text-neutral-700 dark:text-neutral-200">View event</span><ArrowUpRight aria-hidden="true" className="size-4 text-orange-600"/></div>
      </div>
    </article>
  </Link>;
}
