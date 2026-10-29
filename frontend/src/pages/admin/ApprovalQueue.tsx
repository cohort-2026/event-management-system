import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { approveEvent, getPendingEvents, rejectEvent } from '@/services/eventService';
import type { Event } from '@/types/event';

type ReviewEvent = Event & {
  organizer: { firstname: string; lastname: string; email: string };
};

const formatDate = (date: string): string => new Date(date).toLocaleString('en-ZA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ApprovalQueue() {
  const [pending, setPending] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPending = async () => {
    const response = await getPendingEvents();
    setPending(response.data.data as ReviewEvent[]);
    setError('');
  };

  useEffect(() => {
    let active = true;
    getPendingEvents()
      .then(response => {
        if (active) setPending(response.data.data as ReviewEvent[]);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Pending events could not be loaded.')
            : 'Pending events could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleApprove = async (event: ReviewEvent) => {
    setError('');
    setNotice('');
    setBusyId(event.id);
    try {
      const response = await approveEvent(event.id);
      setNotice(response.data.message ?? `"${event.title}" approved.`);
      await loadPending();
    } catch (approvalError) {
      setError(axios.isAxiosError(approvalError)
        ? (approvalError.response?.data?.message ?? 'Event could not be approved.')
        : 'Event could not be approved.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setError('');
    setNotice('');
    setBusyId(rejectId);
    try {
      const response = await rejectEvent(rejectId, reason.trim());
      setNotice(response.data.message ?? 'Event rejected and organizer notified.');
      setRejectId(null);
      setReason('');
      await loadPending();
    } catch (rejectionError) {
      setError(axios.isAxiosError(rejectionError)
        ? (rejectionError.response?.data?.message ?? 'Event could not be rejected.')
        : 'Event could not be rejected.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Approval Queue</h1>
        <p className="mt-1 text-neutral-500">Review event details, then approve or provide feedback for changes.</p>
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : pending.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-24 text-center">
          <p className="font-semibold text-neutral-800">All caught up!</p>
          <p className="mt-1 text-sm text-neutral-500">No events are pending approval.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {pending.map(event => (
            <article key={event.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              {event.bannerImageUrl && <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="h-52 w-full object-cover" />}
              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">PENDING APPROVAL</Badge>
                      <Badge variant="default">{event.category}</Badge>
                      <Badge variant="info">{event.eventType.replace('_', ' ')}</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-neutral-900">{event.title}</h2>
                    <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{event.description}</p>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-neutral-500 md:grid-cols-2">
                      <p>Organizer: {event.organizer.firstname} {event.organizer.lastname} ({event.organizer.email})</p>
                      <p>Venue: {event.venue}</p>
                      <p>Starts: {formatDate(event.startTime)}</p>
                      <p>Ends: {formatDate(event.endTime)}</p>
                      {event.meetingDetails && <p className="md:col-span-2">Meeting: {event.meetingDetails}</p>}
                      <p>Capacity: {event.capacity}</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-bold text-neutral-800">Ticket types</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {event.ticketTypes.map(ticket => (
                          <li key={ticket.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                            {ticket.name} · {ticket.price === 0 ? 'Free' : `R${ticket.price.toFixed(2)}`} · {ticket.quantity} tickets
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="danger" size="sm" disabled={busyId === event.id} onClick={() => { setRejectId(event.id); setReason(''); }}>
                      Reject
                    </Button>
                    <Button size="sm" loading={busyId === event.id} onClick={() => void handleApprove(event)}>
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(rejectId)} onClose={() => setRejectId(null)} title="Reject event" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">Give specific feedback so the organizer can correct and resubmit the event.</p>
          <textarea
            rows={5}
            maxLength={2000}
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Describe what needs to change (at least 10 characters)…"
            className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-neutral-500">{reason.trim().length}/2000 characters</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={Boolean(busyId)} onClick={() => setRejectId(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" loading={Boolean(busyId)} disabled={reason.trim().length < 10} onClick={() => void handleReject()}>
              Confirm rejection
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
