import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';

const events = [
  { id: '1', title: 'Annual Tech Summit 2025',       date: '15 Sep 2025', capacity: 500, registered: 358, checkedIn: 0,   vendors: 12, vendorCapacity: 15, status: 'PUBLISHED'  },
  { id: '2', title: 'Leadership Workshop',            date: '22 Aug 2025', capacity: 80,  registered: 57,  checkedIn: 0,   vendors: 2,  vendorCapacity: 4,  status: 'PUBLISHED'  },
  { id: '6', title: 'Women in Business Breakfast',    date: '14 Aug 2025', capacity: 100, registered: 88,  checkedIn: 85,  vendors: 3,  vendorCapacity: 3,  status: 'COMPLETED'  },
  { id: '8', title: 'Mid-Year Strategy Offsite',      date: '10 Jul 2025', capacity: 60,  registered: 60,  checkedIn: 58,  vendors: 0,  vendorCapacity: 0,  status: 'COMPLETED'  },
];

const statusVariant: Record<string, 'success' | 'info'> = { PUBLISHED: 'success', COMPLETED: 'info' };

export default function ReportsDashboard() {
  const totalRegistered = events.reduce((s, e) => s + e.registered, 0);
  const totalCheckedIn  = events.reduce((s, e) => s + e.checkedIn, 0);
  const completedEvents = events.filter(e => e.status === 'COMPLETED');
  const avgCheckinRate  = completedEvents.length
    ? Math.round(completedEvents.reduce((s, e) => s + (e.checkedIn / e.registered) * 100, 0) / completedEvents.length)
    : 0;

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Management"
          subtitle="Analytics"
          items={[
            { label: 'Reports overview', to: '/management/reports', icon: <ChartIcon /> },
            { label: 'Event report', to: '/management/reports/1', icon: <EventIcon /> },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Reports & Analytics"
            subtitle="Aggregate view across all events"
            breadcrumbs={[{ label: 'Dashboard', to: '/management/reports' }]}
          />

       

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total events"       value={events.length}    icon={<CalIcon />}    color="brand"   />
            <StatCard label="Total registrations" value={totalRegistered} icon={<UsersIcon />}  color="purple"  />
            <StatCard label="Total check-ins"    value={totalCheckedIn}   icon={<CheckIcon />}  color="emerald" />
            <StatCard label="Avg check-in rate"  value={`${avgCheckinRate}%`} sub="completed events" icon={<ChartIcon />} color="amber" />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-900">Event Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    {['Event', 'Date', 'Status', 'Registrations', 'Check-in rate', 'Vendor fill', 'Details'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {events.map(e => {
                    const checkinRate = e.status === 'COMPLETED' ? Math.round((e.checkedIn / e.registered) * 100) : null;
                    const vendorFill  = e.vendorCapacity > 0 ? Math.round((e.vendors / e.vendorCapacity) * 100) : null;
                    return (
                      <tr key={e.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-neutral-900">{e.title}</td>
                        <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{e.date}</td>
                        <td className="px-5 py-3">
                          <Badge variant={statusVariant[e.status] ?? 'default'}>{e.status}</Badge>
                        </td>
                        <td className="px-5 py-3 text-neutral-700">{e.registered} / {e.capacity}</td>
                        <td className="px-5 py-3">
                          {checkinRate !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-700">{checkinRate}%</span>
                              <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${checkinRate}%` }} />
                              </div>
                            </div>
                          ) : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          {vendorFill !== null ? (
                            <span className="text-neutral-700">{e.vendors} / {e.vendorCapacity} ({vendorFill}%)</span>
                          ) : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <Link to={`/management/reports/${e.id}`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                            View report →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

const CalIcon   = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ChartIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const EventIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 3v4M16 3v4M4 11h16" /></svg>;
