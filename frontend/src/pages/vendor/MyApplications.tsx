import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, FileText, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyApplications } from '@/services/vendorService';
import type { VendorApplication, VendorApplicationStatus } from '@/types/vendor';

const variants: Record<VendorApplicationStatus, BadgeVariant> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const label = (status: VendorApplicationStatus) => status === 'PENDING_REVIEW' ? 'Pending' : status[0] + status.slice(1).toLowerCase();
const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not available';

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [selected, setSelected] = useState<VendorApplication | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | VendorApplicationStatus>('ALL');
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
          ? loadError.response?.data.message ?? 'Your applications could not be loaded.'
          : 'Your applications could not be loaded.');
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

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selected]);

  const query = search.trim().toLocaleLowerCase();
  const filtered = applications.filter(application =>
    (status === 'ALL' || application.status === status)
    && (!query || `${application.id} ${application.event?.title ?? ''} ${application.requestedStandType} ${application.status}`.toLocaleLowerCase().includes(query)));

  return (
    <VendorPortalLayout businessName={businessName} title="My applications" subtitle="Review your submitted event participation requests and organizer decisions.">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search applications</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search event, service, or reference" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </label>
          <select aria-label="Filter by application status" value={status} onChange={event => setStatus(event.target.value as 'ALL' | VendorApplicationStatus)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-[#171823] dark:text-white">
            <option value="ALL">All statuses</option><option value="PENDING_REVIEW">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
          </select>
        </div>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && applications.length === 0 ? null : filtered.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>{['Event / reference', 'Service', 'Applied', 'Decision date', 'Status', ''].map(heading => <th key={heading || 'details'} scope="col" className="px-5 py-3">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                  {filtered.map(application => (
                    <tr key={application.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{application.event?.title ?? 'Event'}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{application.id}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{application.requestedStandType}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{dateLabel(application.createdAt)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{application.decidedAt ? dateLabel(application.decidedAt) : 'Not available'}</td>
                      <td className="px-5 py-4"><Badge variant={variants[application.status]}>{label(application.status)}</Badge></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(application)} className="whitespace-nowrap font-semibold text-violet-700 dark:text-violet-300">View details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">Organizer names and a separate last-updated timestamp are not included in the Vendor applications response. Withdrawn status and pending-application withdrawal are not supported by the current API.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#171823]">
            <FileText size={28} className="mx-auto text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">{applications.length ? 'No matching applications' : 'No applications submitted'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your event applications and their status will appear here.</p>
            {!applications.length && <Link to="/vendor/events" className="mt-4 inline-flex font-semibold text-violet-700 dark:text-violet-300">Browse events <ArrowUpRight size={16} /></Link>}
          </div>
        )}
      </div>
      {selected && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="vendor-application-title" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171823]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Application details</p><h2 id="vendor-application-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selected.event?.title ?? 'Event'}</h2></div>
              <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="Close application details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
            </header>
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <Detail label="Reference" value={selected.id} />
              <Detail label="Status" value={label(selected.status)} />
              <Detail label="Service category" value={selected.requestedStandType} />
              <Detail label="Requested stand size" value={selected.requestedStandSize} />
              <Detail label="Application date" value={dateLabel(selected.createdAt)} />
              <Detail label="Decision date" value={selected.decidedAt ? dateLabel(selected.decidedAt) : 'Not available'} />
              <Detail label="Venue" value={selected.event?.venue ?? 'Not available'} />
              <Detail label="Event date" value={selected.event?.date ? dateLabel(selected.event.date) : 'Not available'} />
              <div className="sm:col-span-2"><Detail label="Stand description" value={selected.standDescription || 'Not provided'} /></div>
              {selected.rejectionReason && <div className="sm:col-span-2"><Detail label="Organizer feedback" value={selected.rejectionReason} /></div>}
              <div className="sm:col-span-2"><Detail label="Organizer and last-updated details" value="Organizer names and a separate last-updated timestamp are not included in the Vendor applications response. Withdrawn status and pending-application withdrawal are not supported by the current API." /></div>
            </dl>
          </section>
        </div>
      )}
    </VendorPortalLayout>
  );
}

function Detail({ label: heading, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{heading}</dt><dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-100">{value}</dd></div>;
}
