import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import type { BadgeVariant } from '@/components/ui/Badge';

const bookings = [
  { id: 'BK-2301', event: 'Annual Tech Summit 2025', date: '2025-09-15', status: 'CONFIRMED', price: 'R350' },
  { id: 'BK-2302', event: 'Digital Marketing Masterclass', date: '2025-09-03', status: 'PENDING', price: 'R499' },
  { id: 'BK-2303', event: 'Women in Business Breakfast', date: '2025-08-14', status: 'CONFIRMED', price: 'R250' },
];

const bookingVariant: Record<string, BadgeVariant> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
};

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const { events, total: eventCount, loading: eventsLoading, error: eventsError } = useEvents();

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Attendee"
          subtitle="My events"
          items={[
            { label: 'Overview', to: '/attendee', icon: <OverviewIcon /> },
            { label: 'My bookings', to: '/attendee/bookings', icon: <BookingIcon /> },
            { label: 'All events', to: '/events', icon: <EventIcon /> },
            { label: 'Tickets', to: '/attendee/tickets', icon: <TicketIcon /> },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Attendee Dashboard"
            subtitle="Manage your event journey"
            breadcrumbs={[{ label: 'Dashboard', to: '/attendee' }]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Bookings" value={bookings.length} icon={<BookingIcon />} color="brand" />
            <StatCard label="Published events" value={eventCount} icon={<EventIcon />} color="emerald" />
            <StatCard label="Total spent" value="R1,099" icon={<TicketIcon />} color="purple" />
            <StatCard label="Saved tickets" value={3} icon={<CheckIcon />} color="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,1fr)_minmax(360px,0.9fr)] gap-8">
            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-400">My bookings</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Recent registrations</h2>
                </div>
                <Link to="/attendee/bookings" className="text-sm font-bold text-brand-700 hover:text-brand-900 transition-colors">
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {bookings.map(booking => (
                  <div key={booking.id} className="flex items-center justify-between gap-4 border border-neutral-100 rounded-2xl px-4 py-4 hover:bg-neutral-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-neutral-900 truncate">{booking.event}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{booking.date}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{booking.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={bookingVariant[booking.status] ?? 'default'}>{booking.status}</Badge>
                      <span className="text-sm font-black text-neutral-800">{booking.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-400">Events</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">All events</h2>
                </div>
                <Link to="/events" className="text-sm font-bold text-brand-700 hover:text-brand-900 transition-colors">
                  Browse
                </Link>
              </div>

              <div className="space-y-3">
                {eventsError && <p role="alert" className="text-sm text-rose-600">{eventsError}</p>}
                {eventsLoading && <p className="text-sm text-neutral-500">Loading published events…</p>}
                {!eventsLoading && !eventsError && events.length === 0 && (
                  <p className="text-sm text-neutral-500">There are no published events to browse right now.</p>
                )}
                {events.slice(0, 4).map(event => (
                  <div key={event.id} className="flex items-center justify-between gap-4 border border-neutral-100 rounded-2xl px-4 py-4 hover:bg-neutral-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-neutral-900 truncate">{event.title}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mt-1">{event.category} • {event.venue}</p>
                      <p className="text-[11px] text-neutral-400 mt-1">{new Date(event.startTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <Link to={`/events/${event.id}`}> 
                      <Button size="sm" variant="secondary">Details</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-8 bg-white rounded-3xl border border-neutral-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-400">Welcome back</span>
                <h2 className="text-xl font-black text-neutral-900 mt-1">{user?.firstname ?? 'Attendee'} {user?.lastname ?? ''}</h2>
              </div>
              <Link to="/events">
                <Button>Explore events</Button>
              </Link>
            </div>
          </section>
        </section>
      </div>
    </PageWrapper>
  );
}

const OverviewIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10" /></svg>;
const BookingIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2H4V7zM4 11h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z" /></svg>;
const EventIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const TicketIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5H9a2 2 0 00-2 2v3a2 2 0 003 1.72V12a2 2 0 005.5 0v-.28A2 2 0 0015 10V7a2 2 0 000-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19h6" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 0" /></svg>;
