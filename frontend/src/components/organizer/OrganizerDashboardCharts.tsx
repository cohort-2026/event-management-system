import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Event, EventStatus } from '@/types/event';

interface OrganizerDashboardChartsProps {
  events: Event[];
}

const statusColors: Record<EventStatus, string> = {
  PUBLISHED: '#7c3aed',
  DRAFT: '#94a3b8',
  PENDING_APPROVAL: '#f59e0b',
  REJECTED: '#f43f5e',
  CANCELLED: '#64748b',
  COMPLETED: '#14b8a6',
};

const statusLabel = (status: EventStatus) => status.replaceAll('_', ' ').toLowerCase()
  .replace(/\b\w/g, character => character.toUpperCase());

export default function OrganizerDashboardCharts({ events }: OrganizerDashboardChartsProps) {
  const performance = [...events]
    .sort((a, b) => (b.capacity - b.availableCapacity) - (a.capacity - a.availableCapacity))
    .slice(0, 6)
    .map(event => ({
      name: event.title.length > 18 ? `${event.title.slice(0, 18)}…` : event.title,
      fullName: event.title,
      registered: Math.max(0, event.capacity - event.availableCapacity),
      capacity: event.capacity,
    }));

  const eventStatuses = Object.entries(
    events.reduce<Partial<Record<EventStatus, number>>>((counts, event) => {
      counts[event.status] = (counts[event.status] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([status, value]) => ({ status: status as EventStatus, value }));

  return (
    <section id="event-analytics" className="space-y-4 scroll-mt-24">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Event analytics</h2>
        <p className="mt-1 text-sm text-slate-500">A current snapshot of registrations and event status.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Registrations by event</h3>
            <p className="mt-1 text-xs text-slate-500">Current registered places compared with event capacity.</p>
          </div>
          {performance.length ? (
            <div className="h-64 w-full" role="img" aria-label="Bar chart comparing registered places and capacity by event">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance} margin={{ top: 8, right: 12, left: -18, bottom: 4 }} barGap={5}>
                  <CartesianGrid stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f8f7fc' }}
                    contentStyle={{ border: '1px solid #e8e7ef', borderRadius: 12, boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Bar dataKey="registered" name="Registered places" fill="#7c3aed" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="capacity" name="Capacity" fill="#ddd6fe" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmptyState message="Create an event to see registration performance." />
          )}
          <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-violet-600" />Registered places</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-violet-200" />Capacity</span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-slate-900">Event status</h3>
            <p className="mt-1 text-xs text-slate-500">Distribution of your events by current status.</p>
          </div>
          {eventStatuses.length ? (
            <>
              <div className="h-52 w-full" role="img" aria-label="Donut chart showing events by status">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={eventStatuses} dataKey="value" nameKey="status" innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none">
                      {eventStatuses.map(item => <Cell key={item.status} fill={statusColors[item.status]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, statusLabel(name as EventStatus)]}
                      contentStyle={{ border: '1px solid #e8e7ef', borderRadius: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {eventStatuses.map(item => (
                  <li key={item.status} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <i className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[item.status] }} />
                    {statusLabel(item.status)} <span className="font-semibold text-slate-700">{item.value}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ChartEmptyState message="Event status data will appear here." />
          )}
        </article>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <UnavailableAnalyticsCard
          title="Booking trends"
          description="Monthly booking history isn't provided by the current API."
        />
        <UnavailableAnalyticsCard
          title="Revenue overview"
          description="The current API doesn't provide organizer revenue or payment totals."
        />
      </div>
    </section>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function UnavailableAnalyticsCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-5 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500">
        Historical analytics will appear when booking and payment reporting is available.
      </div>
    </article>
  );
}
