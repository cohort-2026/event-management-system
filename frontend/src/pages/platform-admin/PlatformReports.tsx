import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Spinner from '@/components/ui/Spinner';
import { getAdminAuditHistory, getManagedAdmins, type AdminAuditEvent, type ManagedAdmin } from '@/services/platformAdminService';
import { EmptyState, ErrorBanner, MetricCard } from '@/pages/platform-admin/components/PlatformAdminShared';
import { formatAction, formatDate } from '@/pages/platform-admin/platformAdminUtils';

export default function PlatformReports() {
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getManagedAdmins(), getAdminAuditHistory()])
      .then(([adminResponse, auditResponse]) => {
        if (!active) return;
        setAdmins(adminResponse.data.data);
        setEvents(auditResponse.data.data);
      })
      .catch(err => {
        if (active) {
          setError(axios.isAxiosError(err)
            ? (err.response?.data?.message ?? 'Platform report data could not be loaded.')
            : 'Platform report data could not be loaded.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const actionSummary = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach(event => counts.set(event.action, (counts.get(event.action) ?? 0) + 1));
    return [...counts.entries()].sort((first, second) => second[1] - first[1]);
  }, [events]);

  const exportCsv = () => {
    const rows = [
      ['Record type', 'Date', 'Name / action', 'Email / actor', 'Status / outcome', 'Affected account ID'],
      ...admins.map(admin => [
        'Administrator account',
        admin.createdAt,
        `${admin.firstname} ${admin.lastname}`,
        admin.email,
        admin.isActive ? 'Active' : 'Inactive',
        admin.id,
      ]),
      ...events.map(event => [
        'Audit event',
        event.createdAt,
        event.action,
        `${event.actor.firstname} ${event.actor.lastname} (${event.actor.email})`,
        event.outcome,
        event.affectedUserId ?? '',
      ]),
    ];
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `platform-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-neutral-200 bg-white"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Access governance</p>
          <h2 className="mt-1.5 text-lg font-bold text-neutral-900">Administrator activity report</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
            Summary of current administrator accounts and the latest {events.length} audit entries available from the platform service.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={Boolean(error)}
          className="mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0"
        >
          <DownloadIcon /> Export CSV
        </button>
      </section>

      <section aria-label="Report metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total administrators" value={admins.length} note="Current directory" icon={<UsersIcon />} tone="brand" />
        <MetricCard label="Active accounts" value={admins.filter(admin => admin.isActive).length} note="Enabled access" icon={<CheckIcon />} tone="green" />
        <MetricCard label="Setup pending" value={admins.filter(admin => admin.mustChangePassword).length} note="Awaiting first password change" icon={<ClockIcon />} tone="amber" />
        <MetricCard label="Audited actions" value={events.length} note="Most recent records" icon={<ActivityIcon />} tone="slate" />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-bold text-neutral-900">Actions by type</h2>
            <p className="mt-1 text-xs text-neutral-500">Distribution within the available audit history</p>
          </div>
          {actionSummary.length === 0 ? (
            <EmptyState title="No audit data yet" description="Action summaries will appear when platform activity is recorded." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {actionSummary.map(([action, count]) => (
                <div key={action} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <span className="text-sm font-medium text-neutral-700">{formatAction(action)}</span>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-bold text-neutral-900">Administrator directory summary</h2>
            <p className="mt-1 text-xs text-neutral-500">Account records currently managed on the platform</p>
          </div>
          {admins.length === 0 ? (
            <EmptyState title="No administrator accounts" description="There are no administrator accounts to report." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-left text-sm">
                <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <tr><th className="px-5 py-3">Administrator</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Access</th><th className="px-5 py-3">Setup</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {admins.map(admin => (
                    <tr key={admin.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-neutral-800">{admin.firstname} {admin.lastname}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{admin.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-neutral-500">{formatDate(admin.createdAt)}</td>
                      <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{admin.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-5 py-3.5 text-xs text-neutral-600">{admin.mustChangePassword ? 'Pending' : 'Complete'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <p className="text-xs leading-5 text-neutral-400">This report contains platform administrator access data only. Audit history is limited to the latest 100 records returned by the service.</p>
    </div>
  );
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function UsersIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M10 11a4 4 0 100-8 4 4 0 000 8zm7-7.87a4 4 0 010 7.75" /></svg>; }
function CheckIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12l4 4L19 6" /></svg>; }
function ClockIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={1.7} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 7v5l3 2" /></svg>; }
function ActivityIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 12h4l3-8 4 16 3-8h4" /></svg>; }
function DownloadIcon() { return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l-4-4m4 4l4-4M5 17v3h14v-3" /></svg>; }
