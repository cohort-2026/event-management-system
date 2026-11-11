import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CalendarDays, MapPin, Store } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getEventById } from '@/services/eventService';
import type { Event } from '@/types/event';

export default function VendorEventDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getEventById(id)
      .then(response => {
        if (!active) return;
        setCurrentTime(Date.now());
        setEvent(response.data.data);
      })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Event details could not be loaded.'
          : 'Event details could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';
  const applicationsOpen = Boolean(event && event.status === 'PUBLISHED'
    && currentTime !== null
    && new Date(event.startTime || event.date).getTime() > currentTime
    && event.availableVendorStands > 0);
  const eligible = applicationsOpen && user?.vendorProfileStatus === 'APPROVED';

  return (
    <VendorPortalLayout businessName={businessName} title={event?.title ?? 'Event details'} subtitle="Review event information and vendor participation availability.">
      <div className="space-y-5">
        <Link to="/vendor/events" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300"><ArrowLeft size={16} /> Back to events</Link>
        {loading ? <div className="flex justify-center py-16"><Spinner /></div> : !event ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error || 'This event is unavailable. Vendor event details are served only for published events.'}</p>
        ) : (
          <>
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823]">
              {event.bannerImageUrl && <img src={event.bannerImageUrl} alt={`${event.title} cover`} className="max-h-[28rem] w-full object-cover" />}
              <div className="space-y-5 p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{event.category} · {event.eventType.replaceAll('_', ' ')}</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{event.title}</h2>
                  </div>
                  <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'default'}>{event.status}</Badge>
                </div>
                <div className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                  <p className="flex items-start gap-2"><CalendarDays size={17} className="mt-0.5 shrink-0 text-violet-600" />{new Date(event.startTime || event.date).toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'short' })}{event.endTime && ` – ${new Date(event.endTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`}</p>
                  <p className="flex items-start gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-violet-600" />{event.venue || 'Venue unavailable'}</p>
                </div>
                <div className="border-t border-slate-100 pt-5 dark:border-white/10">
                  <h3 className="font-semibold text-slate-900 dark:text-white">About this event</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{event.description}</p>
                </div>
                {event.meetingDetails && <p className="text-sm text-slate-600 dark:text-slate-300">Event details: {event.meetingDetails}</p>}
              </div>
            </article>
            <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Store size={18} className="text-violet-600" /> Vendor participation</h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <p className="text-slate-600 dark:text-slate-300">Status: <span className="font-semibold">{applicationsOpen ? 'Applications open' : event.availableVendorStands <= 0 ? 'No spaces available' : 'Applications closed'}</span></p>
                  <p className="text-slate-600 dark:text-slate-300">{event.availableVendorStands} vendor spaces available</p>
                  <p className="text-slate-600 dark:text-slate-300">Stand rate: {event.vendorStandRatePerSqm ? `R${Number(event.vendorStandRatePerSqm).toFixed(2)} per m²` : 'No rate provided'}</p>
                  <p className="text-slate-500 dark:text-slate-400">Vendor categories, application deadline, and additional instructions are not provided by the event API.</p>
                </div>
                {event.organizer && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Organizer: {event.organizer.firstname} {event.organizer.lastname} · {event.organizer.email}</p>}
                {!event.organizer && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Organizer contact details are not included in the public event response.</p>}
              </div>
              {eligible ? (
                <Link to={`/vendor/events/${event.id}/apply`}><Button className="w-full sm:w-auto">Apply now</Button></Link>
              ) : applicationsOpen && user?.vendorProfileStatus !== 'APPROVED' ? (
                <Link to="/vendor/profile"><Button className="w-full sm:w-auto">Complete vendor approval</Button></Link>
              ) : (
                <Button disabled className="w-full sm:w-auto">Application unavailable</Button>
              )}
            </section>
          </>
        )}
      </div>
    </VendorPortalLayout>
  );
}
