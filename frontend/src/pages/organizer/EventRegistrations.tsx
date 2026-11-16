import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Spinner from '@/components/ui/Spinner';
import { getEventRegistrations } from '@/services/eventService';
import type { EventRegistration } from '@/services/eventService';

const sidebarItems = [
  { label: 'Overview', to: '/organizer', icon: <CalendarIcon /> },
  { label: 'Create event', to: '/organizer/events/new', icon: <PlusIcon /> },
  { label: 'My events', to: '/organizer/events', icon: <CalendarIcon /> },
  { label: 'My profile', to: '/organizer/profile', icon: <ProfileIcon /> },
];

export default function EventRegistrations() {
  const { id = '' } = useParams();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8 lg:flex-row">
        <DashboardSidebar title="Organizer" subtitle="Operations" items={sidebarItems} />
        <section className="min-w-0 flex-1">
          <DashboardHeader title="Event registrations" subtitle="Attendees and ticket status for your event" breadcrumbs={[{ label: 'My events', to: '/organizer/events' }, { label: 'Registrations' }]} />
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {loading ? <div className="flex justify-center py-16"><Spinner /></div> : registrations.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">No registrations yet</h2>
              <p className="mt-2 text-sm text-neutral-600">Attendee bookings will appear here.</p>
              <Link to="/organizer/events" className="mt-4 inline-block text-sm font-semibold text-brand-700">Back to my events</Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-600">
                  <tr><th className="px-4 py-3">Attendee</th><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Registered</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {registrations.map(registration => (
                    <tr key={registration.id}>
                      <td className="px-4 py-3"><p className="font-semibold text-neutral-900">{registration.attendee.firstname} {registration.attendee.lastname}</p><a className="text-xs text-brand-700 hover:underline" href={`mailto:${registration.attendee.email}`}>{registration.attendee.email}</a></td>
                      <td className="px-4 py-3">{registration.ticket ? <><p>{registration.ticket.type}</p><p className="font-mono text-xs text-neutral-500">{registration.ticket.referenceNumber}</p></> : 'Not issued'}</td>
                      <td className="px-4 py-3">{registration.status}{registration.ticket && <p className="text-xs text-neutral-500">Ticket {registration.ticket.status}</p>}</td>
                      <td className="px-4 py-3">{registration.payment ? `${registration.payment.currency} ${Number(registration.payment.amount).toFixed(2)} · ${registration.payment.status}` : registration.paymentStatus}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{new Date(registration.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}

function CalendarIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
}

function ProfileIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12a4 4 0 100-8 4 4 0 000 8zm7 9a7 7 0 00-14 0" /></svg>;
}
