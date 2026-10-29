import { useEffect, useState } from 'react';
import type { Event } from '@/types/event';
import { approveEvent, getPendingEvents, rejectEvent } from '@/services/eventService';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function ApprovalQueue() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    getPendingEvents()
      .then(response => { if (active) setEvents(response.data.data); })
      .catch(() => { if (active) setError('Failed to load pending events. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleApprove = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      await approveEvent(id);
      setEvents(current => current.filter(event => event.id !== id));
    } catch {
      setError('Could not approve this event. Refresh the queue and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !reason.trim()) return;
    setSaving(true);
    setError('');
    try {
      await rejectEvent(rejectId, reason.trim());
      setEvents(current => current.filter(event => event.id !== rejectId));
      setRejectId(null);
      setReason('');
    } catch {
      setError('Could not reject this event. Refresh the queue and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Admin"
          subtitle="Governance"
          items={[
            { label: 'Overview', to: '/admin', icon: <DashboardIcon /> },
            { label: 'Approval queue', to: '/admin/approvals', icon: <QueueIcon /> },
            { label: 'User management', to: '/admin/users', icon: <UsersIcon /> },
          ]}
        />

        <section className="flex-1 min-w-0">
          <DashboardHeader
            title="Event approvals"
            subtitle="Review submissions and decide which events can be published."
            breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Approval queue' }]}
          />

          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Awaiting your review</p>
              <p className="mt-1 text-sm text-neutral-600">Check event details before approving or declining.</p>
            </div>
            <Badge variant="warning">{loading ? 'Loading' : `${events.length} pending`}</Badge>
          </div>

          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {loading ? (
            <div role="status" className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-neutral-500">
              Loading pending events...
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-24 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 4 4L19 6" />
                </svg>
              </span>
              <p className="font-semibold text-neutral-800">All caught up!</p>
              <p className="mt-1 text-sm text-neutral-500">No events are pending approval.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map(event => (
                <article key={event.id} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">Pending approval</Badge>
                        <Badge variant="default">{event.category}</Badge>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-900">{event.title}</h2>
                        <p className="mt-1 text-sm text-neutral-500">
                          Submitted by {event.organizer?.firstname} {event.organizer?.lastname}
                          {event.organizer?.email && ` · ${event.organizer.email}`}
                        </p>
                      </div>
                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Date and time</dt>
                          <dd className="mt-1 text-neutral-700">{new Date(event.date).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Venue</dt>
                          <dd className="mt-1 text-neutral-700">{event.venue}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Capacity</dt>
                          <dd className="mt-1 text-neutral-700">{event.capacity} attendees</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Admission</dt>
                          <dd className="mt-1 text-neutral-700">{event.isFree ? 'Free' : `R${event.price}`}</dd>
                        </div>
                      </dl>
                      <p className="whitespace-pre-line text-sm text-neutral-700">{event.description}</p>
                      <p className="text-xs text-neutral-400">Submitted {new Date(event.updatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:pt-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setReason(''); setRejectId(event.id); }}
                        disabled={saving}
                      >
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => void handleApprove(event.id)} disabled={saving}>
                        Approve
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <Modal open={!!rejectId} onClose={() => !saving && setRejectId(null)} title="Decline event" size="sm">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-neutral-600">Provide a reason for declining. The organizer will see this feedback.</p>
              <textarea
                rows={4}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                aria-label="Reason for declining event"
                className="block w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setRejectId(null); setReason(''); }} disabled={saving}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => void handleReject()} disabled={!reason.trim() || saving}>
                  {saving ? 'Saving...' : 'Confirm decline'}
                </Button>
              </div>
            </div>
          </Modal>
        </section>
      </div>
    </PageWrapper>
  );
}

const DashboardIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  </svg>
);

const QueueIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
