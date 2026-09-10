import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const pendingEvents = [
  { id: '3', title: 'Q4 Strategy Session',       organizer: 'Thabo Nkosi',    submitted: '2 hours ago',  category: 'Training'    },
  { id: '5', title: 'Digital Marketing Summit',  organizer: 'Priya Govender', submitted: '5 hours ago',  category: 'Technology'  },
  { id: '7', title: 'HR Compliance Workshop',    organizer: 'Lerato Dlamini',  submitted: '1 day ago',    category: 'Training'    },
];

const recentUsers = [
  { id: 'u1', name: 'Sipho Mahlangu',  email: 'sipho@example.com',  role: 'ORGANIZER', joined: '1 hour ago'  },
  { id: 'u2', name: 'Fatima Osman',    email: 'fatima@example.com', role: 'ATTENDEE',  joined: '3 hours ago' },
  { id: 'u3', name: 'James van Wyk',   email: 'james@example.com',  role: 'VENDOR',    joined: '6 hours ago' },
];

const roleVariant: Record<string, 'info' | 'success' | 'purple'> = {
  ORGANIZER: 'info', ATTENDEE: 'success', VENDOR: 'purple',
};

export default function AdminDashboard() {
  const [organizer, setOrganizer] = useState({ firstname: '', lastname: '', email: '', organization: '' });

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Admin"
          subtitle="Governance"
          items={[
            { label: 'Overview', to: '/admin', icon: <CalIcon /> },
            { label: 'Approval queue', to: '/admin/approvals', icon: <ClockIcon /> },
            { label: 'User management', to: '/admin/users', icon: <UsersIcon /> },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Admin Dashboard"
            subtitle="Platform overview and pending actions"
            breadcrumbs={[{ label: 'Dashboard', to: '/admin' }]}
          />

          {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
              <p className="text-neutral-500 mt-1">Platform overview and pending actions.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/approvals"><Button variant="secondary">Approval queue</Button></Link>
              <Link to="/admin/users"><Button>Manage users</Button></Link>
            </div>
          </div> */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total users"          value="1 284" icon={<UsersIcon />}  color="brand"   />
            <StatCard label="Published events"     value={24}    icon={<CalIcon />}    color="emerald" />
            <StatCard label="Pending approval"     value={3}     sub="requires action" icon={<ClockIcon />} color="amber" />
            <StatCard label="Total registrations"  value="8 741" icon={<TicketIcon />} color="purple"  />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,1.4fr)_minmax(360px,1fr)] gap-6 mb-8">
            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Access management</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Register organizer</h2>
                </div>
                <span className="rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-[11px] font-black uppercase tracking-wide">Admin action</span>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First name" value={organizer.firstname} onChange={e => setOrganizer({ ...organizer, firstname: e.target.value })} />
                <Input label="Last name" value={organizer.lastname} onChange={e => setOrganizer({ ...organizer, lastname: e.target.value })} />
                <Input label="Email address" type="email" value={organizer.email} onChange={e => setOrganizer({ ...organizer, email: e.target.value })} />
                <Input label="Organization" value={organizer.organization} onChange={e => setOrganizer({ ...organizer, organization: e.target.value })} />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <Button variant="secondary">Cancel</Button>
                <Button>Register organizer</Button>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Admin workflow</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Operational health</h2>
                </div>
                <Badge variant="success">Online</Badge>
              </div>

              <div className="space-y-4 mt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-600">Pending event approvals</span>
                  <span className="text-sm font-black text-neutral-900">{pendingEvents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-600">New user requests</span>
                  <span className="text-sm font-black text-neutral-900">08</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-600">Vendor applications</span>
                  <span className="text-sm font-black text-neutral-900">14</span>
                </div>
              </div>

              <div className="mt-6">
                <Link to="/admin/approvals" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700 transition-colors">
                  Review approvals
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-neutral-900">Pending Approvals</h2>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{pendingEvents.length}</span>
                </div>
                <Link to="/admin/approvals" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
              </div>
              <div className="divide-y divide-neutral-50">
                {pendingEvents.map(e => (
                  <div key={e.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{e.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{e.organizer} · {e.submitted}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="default">{e.category}</Badge>
                      <Link to={`/admin/approvals`}>
                        <Button size="sm" variant="secondary">Review</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900">Recent Registrations</h2>
                <Link to="/admin/users" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
              </div>
              <div className="divide-y divide-neutral-50">
                {recentUsers.map(u => (
                  <div key={u.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold flex items-center justify-center shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{u.name}</p>
                        <p className="text-xs text-neutral-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={roleVariant[u.role] ?? 'default'}>{u.role}</Badge>
                      <span className="text-xs text-neutral-400 whitespace-nowrap">{u.joined}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

const UsersIcon  = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CalIcon    = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClockIcon  = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TicketIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
