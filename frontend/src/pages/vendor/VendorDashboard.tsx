import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';

const statusVariant: Record<string, BadgeVariant> = {
  APPROVED: 'success', PENDING_REVIEW: 'warning', REJECTED: 'danger',
};

const applications = [
  { id: 'a1', event: 'Annual Tech Summit 2025',      date: '15 Sep 2025', company: 'TechGear SA',    status: 'APPROVED',       staff: 3 },
  { id: 'a2', event: 'Startup Networking Evening',   date: '08 Aug 2025', company: 'TechGear SA',    status: 'PENDING_REVIEW', staff: 0 },
  { id: 'a3', event: 'Digital Marketing Masterclass',date: '03 Sep 2025', company: 'TechGear SA',    status: 'REJECTED',       staff: 0 },
];

export default function VendorDashboard() {

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Vendor"
          subtitle="Operations"
          items={[
            { label: 'Overview', to: '/vendor', icon: <DocIcon /> },
            { label: 'Apply for a stand', to: '/events', icon: <PlusIcon /> },
            { label: 'My applications', to: '/vendor/applications', icon: <DocIcon /> },
            { label: 'Staff management', to: '/vendor/applications/a1/staff', icon: <UsersIcon /> },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Vendor Dashboard"
            subtitle="Overview of your event stand activity"
            breadcrumbs={[{ label: 'Dashboard', to: '/vendor' }]}
          />

          {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Vendor Dashboard</h1>
              <p className="text-neutral-500 mt-1">Welcome back, {user?.firstname}. Manage your stand applications.</p>
            </div>
            <Link to="/events">
              <Button>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Apply for a stand
              </Button>
            </Link>
          </div> */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total applications" value={3}  icon={<DocIcon />}   color="brand"   />
            <StatCard label="Approved"           value={1}  icon={<CheckIcon />} color="emerald" />
            <StatCard label="Pending review"     value={1}  icon={<ClockIcon />} color="amber"   />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">My Applications</h2>
              <Link to="/vendor/applications" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    {['Event', 'Date', 'Status', 'Staff', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {applications.map(a => (
                    <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-neutral-900">{a.event}</td>
                      <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{a.date}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[a.status] ?? 'default'}>{a.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3 text-neutral-700">{a.status === 'APPROVED' ? a.staff : '—'}</td>
                      <td className="px-5 py-3">
                        {a.status === 'APPROVED' && (
                          <Link to={`/vendor/applications/${a.id}/staff`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                            Manage staff
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

const DocIcon   = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
