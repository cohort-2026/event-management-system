import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, MapPin, Store, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyApplications } from '@/services/vendorService';
import type { VendorApplication } from '@/types/vendor';

export default function VendorMyEvents() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [selected, setSelected] = useState<VendorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then(response => { if (active) setApplications(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Your approved events could not be loaded.'
          : 'Your approved events could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selected]);

  const approved = useMemo(() => applications
    .filter(application => application.status === 'APPROVED')
    .sort((left, right) => new Date(left.event?.date ?? '').getTime() - new Date(right.event?.date ?? '').getTime()),
  [applications]);

  return (
    <VendorPortalLayout businessName={businessName} title="My events" subtitle="Events where your vendor application has been approved.">
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && applications.length === 0 ? null : approved.length ? (
        <section aria-label="Approved vendor events" className="grid gap-5 lg:grid-cols-2">
          {approved.map(application => (
            <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Approved participation</p><h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">{application.event?.title ?? 'Event'}</h2></div>
                <Badge variant="success">Approved</Badge>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2"><CalendarDays size={16} className="text-violet-600" />{application.event?.date ? new Date(application.event.date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable'}</p>
                <p className="flex items-center gap-2"><MapPin size={16} className="text-violet-600" />{application.event?.venue ?? 'Venue unavailable'}</p>
                <p className="flex items-center gap-2"><Store size={16} className="text-violet-600" />{application.requestedStandType} · {application.requestedStandSize}</p>
                {application.assignedStand && <p>Assigned stand: <span className="font-semibold">{application.assignedStand}</span></p>}
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Organizer contact and event instructions are not included in the Vendor applications response.</p>
                <button type="button" onClick={() => setSelected(application)} className="mt-3 inline-flex text-sm font-semibold text-violet-700 dark:text-violet-300">View participation details →</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#171823]">
          <h2 className="font-semibold text-slate-900 dark:text-white">No approved event participation</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Only approved applications are shown here. Pending and rejected requests are listed under My Applications.</p>
          <Link to="/vendor/applications" className="mt-4 inline-flex text-sm font-semibold text-violet-700 dark:text-violet-300">View my applications →</Link>
        </div>
      )}
      {selected && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="vendor-event-details-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171823]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Approved participation</p><h2 id="vendor-event-details-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selected.event?.title ?? 'Event'}</h2></div>
              <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="Close event details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
            </header>
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Event date</dt><dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{selected.event?.date ? new Date(selected.event.date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Venue</dt><dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{selected.event?.venue ?? 'Not available'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Approved service</dt><dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{selected.requestedStandType} · {selected.requestedStandSize}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Assigned stand</dt><dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{selected.assignedStand || 'Not assigned'}</dd></div>
              <p className="text-sm text-slate-500 dark:text-slate-400 sm:col-span-2">Organizer details, event instructions, and cancellation status are not included in the Vendor applications response.</p>
            </dl>
          </section>
        </div>
      )}
    </VendorPortalLayout>
  );
}
