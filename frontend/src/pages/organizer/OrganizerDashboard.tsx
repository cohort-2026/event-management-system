import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { Event } from '@/types/event';
import { getMyEvents, submitForApproval } from '@/services/eventService';

const statusVariant: Record<string, BadgeVariant> = {
  PUBLISHED: 'success', DRAFT: 'default', PENDING_APPROVAL: 'warning', REJECTED: 'danger', CANCELLED: 'danger', COMPLETED: 'info',
};

export default function OrganizerDashboard() {
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then(response => { if (active) setMyEvents(response.data.data); })
      .catch(() => { if (active) setError('Failed to load your events.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (id: string) => {
    setSubmittingId(id);
    setError('');
    try {
      const response = await submitForApproval(id);
      setMyEvents(current => current.map(event => event.id === id ? response.data.data : event));
    } catch {
      setError('Could not submit the event for approval.');
    } finally {
      setSubmittingId(null);
    }
  };
  const publishedCount = myEvents.filter(event => event.status === 'PUBLISHED').length;
  const pendingCount = myEvents.filter(event => event.status === 'PENDING_APPROVAL').length;
  const registrations = myEvents.reduce((total, event) => total + event.capacity - event.availableCapacity, 0);

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Organizer"
          subtitle="Operations"
          items={[
            { label: 'Overview', to: '/organizer', icon: <CalIcon /> },
            { label: 'Create event', to: '/organizer/events/new', icon: <PlusIcon /> },
            { label: 'My events', to: '/events', icon: <EventIcon /> },
            { label: 'Registrations', to: '/organizer/events/1/registrations', icon: <UsersIcon /> },
            { label: 'Vendor applications', to: '/organizer/events/1/vendors', icon: <VendorIcon /> },
            { label: 'Check-in', to: '/organizer/events/1/check-in', icon: <CheckIcon /> },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Organizer Dashboard"
            subtitle="Welcome back to your event operations dashboard"
            breadcrumbs={[{ label: 'Dashboard', to: '/organizer' }]}
          />

          {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                Welcome back, {user?.firstname} 👋
              </h1>
              <p className="text-neutral-500 mt-1">Here's an overview of your events.</p>
            </div>
            <Link to="/organizer/events/new">
              <Button>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create event
              </Button>
            </Link>
          </div> */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total events" value={myEvents.length} icon={<CalIcon />} color="brand" />
            <StatCard label="Published" value={publishedCount} icon={<CheckIcon />} color="emerald" />
            <StatCard label="Pending approval" value={pendingCount} icon={<ClockIcon />} color="amber" />
            <StatCard label="Total registrations" value={registrations} sub="across all events" icon={<UsersIcon />} color="purple" />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">My Events</h2>
              <Link to="/events" className="text-sm text-brand-600 hover:text-brand-700">View all events →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    {['Event', 'Date', 'Status', 'Registrations', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {myEvents.map(e => (
                    <tr key={e.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-neutral-900">{e.title}</td>
                      <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[e.status] ?? 'default'}>{e.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3 text-neutral-700">
                        <div className="flex items-center gap-2">
                          <span>{e.capacity - e.availableCapacity} / {e.capacity}</span>
                          <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.round(((e.capacity - e.availableCapacity) / e.capacity) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {(e.status === 'DRAFT' || e.status === 'REJECTED') && (
                            <>
                              <Link to={`/organizer/events/${e.id}/edit`} className="text-xs text-neutral-500 hover:text-neutral-700 font-medium">Edit</Link>
                              {e.status === 'DRAFT' && (
                                <button
                                  type="button"
                                  className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                                  disabled={submittingId === e.id}
                                  onClick={() => void handleSubmit(e.id)}
                                >
                                  {submittingId === e.id ? 'Submitting...' : 'Submit'}
                                </button>
                              )}
                            </>
                          )}
                          {e.status === 'PUBLISHED' && <Link to={`/organizer/events/${e.id}/registrations`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Registrations</Link>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {myEvents.filter(event => event.status === 'REJECTED').map(event => (
            <div key={event.id} className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">
              <p className="font-semibold text-rose-800">{event.title} was rejected</p>
              <p className="mt-1 text-rose-700">Feedback: {event.rejectionReason}</p>
              {event.reviewedAt && <p className="mt-1 text-xs text-rose-600">Reviewed {new Date(event.reviewedAt).toLocaleString()} by {event.reviewedBy?.firstname} {event.reviewedBy?.lastname}</p>}
            </div>
          ))}
          {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}
          {loading && <p className="py-8 text-center text-neutral-500">Loading your events...</p>}
          {!loading && myEvents.length === 0 && <p className="py-8 text-center text-neutral-500">You have not created any events yet.</p>}
        </section>
      </div>
    </PageWrapper>
  );
}

const CalIcon   = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
const EventIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 3v4M16 3v4M4 11h16" /></svg>;
const VendorIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M6 21V7l6-4 6 4v14" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6" /></svg>;
