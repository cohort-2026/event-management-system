import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { getAdminEventAnalytics, type AdminEventAnalytics } from '@/services/eventService';
import type { EventStatus } from '@/types/event';

const recentUsers = [
  { id: 'u1', name: 'Sipho Mahlangu',  email: 'sipho@example.com',  role: 'ORGANIZER', joined: '1 hour ago'  },
  { id: 'u2', name: 'Fatima Osman',    email: 'fatima@example.com', role: 'ATTENDEE',  joined: '3 hours ago' },
  { id: 'u3', name: 'James van Wyk',   email: 'james@example.com',  role: 'VENDOR',    joined: '6 hours ago' },
];

const roleVariant: Record<string, 'info' | 'success' | 'purple'> = {
  ORGANIZER: 'info', ATTENDEE: 'success', VENDOR: 'purple',
};

const eventStatusLabels: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

const eventStatusColors: Record<EventStatus, string> = {
  DRAFT: '#6366f1',
  PUBLISHED: '#10b981',
  CANCELLED: '#94a3b8',
  COMPLETED: '#8b5cf6',
};

export default function AdminDashboard() {
  const [eventAnalytics, setEventAnalytics] = useState<AdminEventAnalytics | null>(null);
  const [loadingEventAnalytics, setLoadingEventAnalytics] = useState(true);
  const [eventAnalyticsError, setEventAnalyticsError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminEventAnalytics()
      .then(response => {
        if (active) setEventAnalytics(response.data.data);
      })
      .catch(err => {
        if (active) {
          setEventAnalyticsError(axios.isAxiosError(err)
            ? (err.response?.data?.message ?? 'Event analytics could not be loaded.')
            : 'Event analytics could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoadingEventAnalytics(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-6">
        <DashboardSidebar
          title="Admin"
          subtitle="Governance"
          appearance="analytics"
          items={[
            { label: 'Overview', to: '/admin', icon: <CalIcon /> },
            {
              label: 'User management',
              to: '/admin/users',
              icon: <UsersIcon />,
              children: [
                { label: 'ORGANIZER PROFILE AWAITING APPROVAL', to: '/admin/users/organizers/pending' },
                { label: 'VENDOR PROFILES AWAITING APPROVAL', to: '/admin/users/vendors/pending' },
              ],
            },
            {
              label: 'User accounts',
              to: '/admin/user-accounts',
              icon: <UsersIcon />,
              children: [
                { label: 'ORGANIZER PROFILES', to: '/admin/users/organizers' },
                { label: 'VENDOR PROFILES', to: '/admin/users/vendors' },
              ],
            },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Admin Dashboard"
            subtitle="Platform overview and pending actions"
            breadcrumbs={[{ label: 'Dashboard', to: '/admin' }]}
            appearance="analytics"
          />

          {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
              <p className="text-neutral-500 mt-1">Platform overview and pending actions.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/users"><Button>User management</Button></Link>
            </div>
          </div> */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total users"          value="1 284" icon={<UsersIcon />}  color="brand" appearance="analytics" />
            <StatCard label="Published events"     value={eventAnalytics?.statusCounts.find(({ status }) => status === 'PUBLISHED')?.count ?? 0} icon={<CalIcon />} color="emerald" appearance="analytics" />
            <StatCard label="Total registrations"  value="8 741" icon={<TicketIcon />} color="purple" appearance="analytics" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <section className="dashboard-panel p-6">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Event overview</span>
                <h2 className="text-xl font-black text-neutral-900 mt-1">Total events</h2>
              </div>
              {eventAnalyticsError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{eventAnalyticsError}</p>}
              {loadingEventAnalytics ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : eventAnalytics && (
                <EventStatusPieChart statusCounts={eventAnalytics.statusCounts} />
              )}
            </section>

            <section className="dashboard-panel p-6">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Publishing overview</span>
                <h2 className="text-xl font-black text-neutral-900 mt-1">Published events</h2>
              </div>
              {eventAnalyticsError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{eventAnalyticsError}</p>}
              {loadingEventAnalytics ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : eventAnalytics && (
                <PublishedEventsBarChart publishedByCategory={eventAnalytics.publishedByCategory} />
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <section className="dashboard-panel p-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Admin workflow</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Operational health</h2>
                </div>
                <Badge variant="success">Online</Badge>
              </div>

              <div className="space-y-4 mt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-600">New user requests</span>
                  <span className="text-sm font-black text-neutral-900">08</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-600">Vendor applications</span>
                  <span className="text-sm font-black text-neutral-900">14</span>
                </div>
              </div>

            </section>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="dashboard-panel overflow-hidden">
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

function EventStatusPieChart({ statusCounts }: { statusCounts: AdminEventAnalytics['statusCounts'] }) {
  const total = statusCounts.reduce((sum, item) => sum + item.count, 0);
  const segments = statusCounts
    .filter(({ count }) => count > 0)
    .reduce<{ parts: string[]; accumulated: number }>((result, { status, count }) => {
      const start = total === 0 ? 0 : (result.accumulated / total) * 100;
      const accumulated = result.accumulated + count;
      const end = total === 0 ? 0 : (accumulated / total) * 100;
      return {
        parts: [...result.parts, `${eventStatusColors[status]} ${start}% ${end}%`],
        accumulated,
      };
    }, { parts: [], accumulated: 0 }).parts;
  const background = segments.length > 0
    ? `conic-gradient(${segments.join(', ')})`
    : '#e5e7eb';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 pt-6">
      <div
        className="w-48 h-48 rounded-full flex items-center justify-center shrink-0"
        style={{ background }}
        role="img"
        aria-label={`Total of ${total} events, shown by status`}
      >
        <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-neutral-900">{total}</span>
          <span className="text-xs font-semibold text-neutral-500">Total events</span>
        </div>
      </div>
      <ul className="w-full space-y-3">
        {statusCounts.map(({ status, count }) => (
          <li key={status} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-neutral-600">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: eventStatusColors[status] }} />
              {eventStatusLabels[status]}
            </span>
            <span className="font-bold text-neutral-900">{count}</span>
          </li>
        ))}
        {statusCounts.length === 0 && <li className="text-sm text-neutral-500">No events have been created yet.</li>}
      </ul>
    </div>
  );
}

function PublishedEventsBarChart({ publishedByCategory }: { publishedByCategory: AdminEventAnalytics['publishedByCategory'] }) {
  const sortedCategories = [...publishedByCategory].sort((a, b) => b.count - a.count);
  const visibleCategories = sortedCategories.slice(0, 6);
  const remainingCount = sortedCategories.slice(6).reduce((sum, item) => sum + item.count, 0);
  if (remainingCount > 0) visibleCategories.push({ category: 'Other', count: remainingCount });
  const maxCount = Math.max(1, ...visibleCategories.map(({ count }) => count));

  return (
    <div className="space-y-5 pt-6" role="img" aria-label="Published events by category">
      {visibleCategories.length > 0 ? visibleCategories.map(({ category, count }) => (
        <div key={category}>
          <div className="flex items-center justify-between gap-3 mb-2 text-sm">
            <span className="font-semibold text-neutral-600 truncate">{category}</span>
            <span className="font-bold text-neutral-900">{count}</span>
          </div>
          <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      )) : (
        <p className="py-8 text-center text-sm text-neutral-500">No events have been published yet.</p>
      )}
    </div>
  );
}

const UsersIcon  = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CalIcon    = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const TicketIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
