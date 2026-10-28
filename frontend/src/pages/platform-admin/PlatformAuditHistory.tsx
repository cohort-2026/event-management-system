import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Spinner from '@/components/ui/Spinner';
import { getAdminAuditHistory, type AdminAuditEvent } from '@/services/platformAdminService';

export default function PlatformAuditHistory() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminAuditHistory()
      .then(response => setEvents(response.data.data))
      .catch(err => setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Audit history could not be loaded.')
        : 'Audit history could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar title="Platform Admin" subtitle="Administration" items={[
          { label: 'Dashboard', to: '/platform-admin', icon: <span aria-hidden="true">⌂</span> },
          { label: 'Register admins', to: '/platform-admin/admins', icon: <span aria-hidden="true">♙</span> },
          { label: 'Audit history', to: '/platform-admin/audit', icon: <span aria-hidden="true">≡</span> },
        ]} />
        <section className="flex-1 min-w-0">
          <DashboardHeader title="Administrative audit history" subtitle="Recent sensitive administrator actions" />
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-10 flex justify-center"><Spinner /></div>
            ) : error ? (
              <p role="alert" className="p-6 text-sm text-rose-700">{error}</p>
            ) : events.length === 0 ? (
              <p className="p-8 text-center text-sm text-neutral-500">No administrative activity has been recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-100 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-5 py-3">When</th><th className="px-5 py-3">Action</th>
                      <th className="px-5 py-3">Actor</th><th className="px-5 py-3">Affected account</th>
                      <th className="px-5 py-3">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {events.map(event => (
                      <tr key={event.id}>
                        <td className="px-5 py-4 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                        <td className="px-5 py-4 font-medium">{event.action.replaceAll('_', ' ')}</td>
                        <td className="px-5 py-4">{event.actor.firstname} {event.actor.lastname}<span className="block text-xs text-neutral-500">{event.actor.email}</span></td>
                        <td className="px-5 py-4">{event.affectedUserId ?? '—'}</td>
                        <td className="px-5 py-4">{event.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
