import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/layouts/PageWrapper';
import { DashboardHeader } from '@/layouts/DashboardSidebar';
import OrganizerSidebar from '@/layouts/OrganizerSidebar';
import Spinner from '@/components/legacy/Spinner';
import { getEventRegistrations } from '@/features/events/services/eventService';
import type { EventRegistration } from '@/features/events/services/eventService';
import { StatusBadge } from '@/components/shared';

export default function EventRegistrations() {
  const { id = '' } = useParams();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let active = true;
    getEventRegistrations(id)
      .then(response => { if (active) setRegistrations(response.data.data); })
      .catch(loadError => {
        if (active) setError(axios.isAxiosError(loadError)
          ? loadError.response?.data?.message ?? 'Registrations could not be loaded.'
          : 'Registrations could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return registrations.filter(registration => {
      const tickets = registration.tickets ?? (registration.ticket ? [registration.ticket] : []);
      const matchesSearch = !query || [
        registration.attendee.firstname,
        registration.attendee.lastname,
        registration.attendee.email,
        registration.status,
        registration.paymentStatus,
        ...tickets.flatMap(ticket => [ticket.referenceNumber, ticket.type, ticket.status]),
      ].some(value => value.toLocaleLowerCase().includes(query));
      return matchesSearch && (statusFilter === 'ALL' || registration.status === statusFilter || registration.paymentStatus === statusFilter);
    });
  }, [registrations, search, statusFilter]);

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader title="Event registrations" subtitle="Attendees and ticket status for your event" breadcrumbs={[{ label: 'My events', to: '/organizer/events' }, { label: 'Registrations' }]} />
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {!loading && !error && registrations.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-sm font-medium text-neutral-700">Search bookings
                <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Attendee, email, booking or ticket" className="mt-1 min-h-10 w-full rounded-lg border border-neutral-300 px-3" />
              </label>
              <label className="text-sm font-medium text-neutral-700">Status
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-neutral-300 px-3 sm:w-48">
                  <option value="ALL">All statuses</option><option value="CONFIRMED">Confirmed</option><option value="PENDING">Pending</option><option value="CANCELLED">Cancelled</option><option value="PAID">Paid</option><option value="NOT_REQUIRED">Not required</option><option value="FAILED">Failed</option>
                </select>
              </label>
            </div>
          )}
          {loading ? <div className="flex justify-center py-16"><Spinner /></div> : registrations.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">No registrations yet</h2>
              <p className="mt-2 text-sm text-neutral-600">Attendee bookings will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              {filteredRegistrations.length === 0 ? <p className="p-8 text-center text-sm text-neutral-600">No bookings match your search and filters.</p> : <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-600">
                  <tr><th className="px-4 py-3">Attendee</th><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Registered</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRegistrations.map(registration => (
                    <tr key={registration.id}>
                      <td className="px-4 py-3"><p className="font-semibold text-neutral-900">{registration.attendee.firstname} {registration.attendee.lastname}</p><a className="text-xs text-brand-700 hover:underline" href={`mailto:${registration.attendee.email}`}>{registration.attendee.email}</a></td>
                      <td className="px-4 py-3">{(registration.tickets ?? (registration.ticket ? [registration.ticket] : [])).length ? <div className="space-y-2">{(registration.tickets ?? (registration.ticket ? [registration.ticket] : [])).map(ticket => <div key={ticket.id}><p className="font-medium">{ticket.type} <StatusBadge status={ticket.status} /></p><p className="font-mono text-xs text-neutral-500">{ticket.referenceNumber}</p></div>)}</div> : 'Not issued'}</td>
                      <td className="px-4 py-3"><StatusBadge status={registration.status} /><p className="mt-1 text-xs text-neutral-500">{(registration.tickets ?? (registration.ticket ? [registration.ticket] : [])).length} ticket{(registration.tickets ?? (registration.ticket ? [registration.ticket] : [])).length === 1 ? '' : 's'}</p></td>
                      <td className="px-4 py-3">{registration.payment && <span className="mr-2 text-xs text-neutral-600">{registration.payment.currency} {Number(registration.payment.amount).toFixed(2)}</span>}<StatusBadge status={registration.payment?.status ?? registration.paymentStatus} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{new Date(registration.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
