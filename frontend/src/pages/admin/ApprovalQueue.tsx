import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const pending = [
  { id: '3', title: 'Q4 Strategy Session',        organizer: 'Thabo Nkosi',    category: 'Training',    date: '10 Oct 2025', venue: 'Sandton Convention Centre', capacity: 40,  isFree: true,  submitted: '2 hours ago'  },
  { id: '5', title: 'Digital Marketing Summit',   organizer: 'Priya Govender', category: 'Technology',  date: '03 Sep 2025', venue: 'Online (Zoom)',             capacity: 200, isFree: false, price: 499, submitted: '5 hours ago'  },
  { id: '7', title: 'HR Compliance Workshop',     organizer: 'Lerato Dlamini',  category: 'Training',    date: '18 Sep 2025', venue: 'The Pivot, Fourways',       capacity: 60,  isFree: false, price: 800, submitted: '1 day ago'    },
];

export default function ApprovalQueue() {
  const [rejectId, setRejectId]     = useState<string | null>(null);
  const [reason, setReason]         = useState('');
  const [dismissed, setDismissed]   = useState<string[]>([]);

  const visible = pending.filter(e => !dismissed.includes(e.id));

  const handleApprove = (id: string) => setDismissed(d => [...d, id]);
  const handleReject  = () => { if (rejectId) setDismissed(d => [...d, rejectId]); setRejectId(null); setReason(''); };

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Approval Queue</h1>
        <p className="text-neutral-500 mt-1">Review and approve or reject events submitted by organisers.</p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-neutral-200">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-neutral-800">All caught up!</p>
          <p className="text-sm text-neutral-400 mt-1">No events are pending approval.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="warning">Pending approval</Badge>
                    <Badge variant="default">{e.category}</Badge>
                  </div>
                  <h2 className="text-lg font-semibold text-neutral-900">{e.title}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                    <span>👤 {e.organizer}</span>
                    <span>📅 {e.date}</span>
                    <span>📍 {e.venue}</span>
                    <span>👥 {e.capacity} capacity</span>
                    <span>🎟 {e.isFree ? 'Free' : `R${(e as typeof e & { price?: number }).price}`}</span>
                  </div>
                  <p className="text-xs text-neutral-400">Submitted {e.submitted}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="danger" size="sm" onClick={() => setRejectId(e.id)}>Reject</Button>
                  <Button size="sm" onClick={() => handleApprove(e.id)}>Approve</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject event" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">Provide a reason for rejection. This will be visible to the organiser.</p>
          <textarea
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Insufficient event description…"
            className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReject} disabled={!reason.trim()}>Confirm rejection</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
