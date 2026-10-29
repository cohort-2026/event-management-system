import { useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '@/components/ui/Spinner';
import { getAdminAuditHistory, type AdminAuditEvent } from '@/services/platformAdminService';
import { EmptyState, ErrorBanner, StatusPill } from '@/pages/platform-admin/components/PlatformAdminShared';
import { formatAction, formatDate } from '@/pages/platform-admin/platformAdminUtils';

export default function PlatformAuditHistory() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminAuditHistory()
      .then(response => { if (active) setEvents(response.data.data); })
      .catch(err => {
        if (active) {
          setError(axios.isAxiosError(err)
            ? (err.response?.data?.message ?? 'Audit history could not be loaded.')
            : 'Audit history could not be loaded.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {error && <div className="p-5"><ErrorBanner message={error} /></div>}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Spinner /></div>
      ) : events.length === 0 ? (
        <EmptyState title="No audit activity" description="There are no administrator actions recorded yet." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Administrator audit log</h2>
              <p className="mt-1 text-xs text-neutral-500">Most recent {events.length} entries, ordered newest first</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{events.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-left text-sm">
              <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-5 py-3 sm:px-6">Date & time</th>
                  <th scope="col" className="px-5 py-3">Action</th>
                  <th scope="col" className="px-5 py-3">Performed by</th>
                  <th scope="col" className="px-5 py-3">Affected account</th>
                  <th scope="col" className="px-5 py-3 sm:px-6">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {events.map(event => (
                  <tr key={event.id} className="align-top transition-colors hover:bg-neutral-50/70">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-neutral-600 sm:px-6">{formatDate(event.createdAt)}</td>
                    <td className="px-5 py-4 font-semibold text-neutral-800">{formatAction(event.action)}</td>
                    <td className="min-w-48 px-5 py-4">
                      <p className="font-medium text-neutral-800">{event.actor.firstname} {event.actor.lastname}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{event.actor.email}</p>
                    </td>
                    <td className="max-w-48 px-5 py-4 text-xs text-neutral-500">
                      {event.affectedUserId ? <span className="break-all font-mono">{event.affectedUserId}</span> : <span className="text-neutral-400">Not applicable</span>}
                    </td>
                    <td className="px-5 py-4 sm:px-6"><StatusPill value={event.outcome} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
