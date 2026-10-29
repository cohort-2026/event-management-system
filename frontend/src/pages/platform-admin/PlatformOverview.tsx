import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner';
import { getAdminAuditHistory, getManagedAdmins, type AdminAuditEvent, type ManagedAdmin } from '@/services/platformAdminService';
import { EmptyState, ErrorBanner, MetricCard, StatusPill } from '@/pages/platform-admin/components/PlatformAdminShared';
import { formatAction, formatDate } from '@/pages/platform-admin/platformAdminUtils';

export default function PlatformOverview() {
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
            ? (err.response?.data?.message ?? 'Platform overview data could not be loaded.')
            : 'Platform overview data could not be loaded.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const activeAdmins = admins.filter(admin => admin.isActive).length;
  const pendingSetup = admins.filter(admin => admin.mustChangePassword).length;

  return (
    <div className="space-y-7">
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-neutral-200 bg-white"><Spinner /></div>
      ) : (
        <>
          <section aria-label="Platform administration metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Administrator accounts" value={admins.length} note="Provisioned platform admins" icon={<UsersIcon />} tone="brand" />
            <MetricCard label="Active access" value={activeAdmins} note="Accounts currently enabled" icon={<CheckIcon />} tone="green" />
            <MetricCard label="Setup pending" value={pendingSetup} note="Awaiting first password change" icon={<ClockIcon />} tone="amber" />
            <MetricCard label="Recent audit entries" value={events.length} note="Latest records available" icon={<ShieldIcon />} tone="slate" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Recent administrator activity</h2>
                <p className="mt-1 text-xs text-neutral-500">Latest privileged actions captured by the audit log</p>
              </div>
              <Link to="/platform-admin/audit" className="text-xs font-semibold text-brand-700 hover:text-brand-900">
                View audit history <span aria-hidden="true">→</span>
              </Link>
            </div>
            {events.length === 0 ? (
              <EmptyState title="No activity recorded yet" description="Administrator actions will appear here when they are recorded." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {events.slice(0, 5).map(event => (
                  <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500"><ActivityIcon /></div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-800">{formatAction(event.action)}</p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">{event.actor.firstname} {event.actor.lastname} · {event.actor.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusPill value={event.outcome} />
                      <time className="text-xs text-neutral-400">{formatDate(event.createdAt)}</time>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Access governance</p>
                <h2 className="mt-1.5 text-base font-bold text-neutral-900">Keep administrator access intentional</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">Review active accounts, pending setup, and recent changes from one place. Every account status change is recorded for accountability.</p>
              </div>
              <Link to="/platform-admin/admins" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800">
                Manage admins
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function UsersIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M10 11a4 4 0 100-8 4 4 0 000 8zm7-7.87a4 4 0 010 7.75" /></svg>; }
function CheckIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12l4 4L19 6" /></svg>; }
function ClockIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth={1.7} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 7v5l3 2" /></svg>; }
function ShieldIcon() { return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 3l8 3v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3z" /></svg>; }
function ActivityIcon() { return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 12h4l3-8 4 16 3-8h4" /></svg>; }
