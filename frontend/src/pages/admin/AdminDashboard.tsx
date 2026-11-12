import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import StatCard from '@/components/ui/StatCard';
import Spinner from '@/components/ui/Spinner';
import { getAdminEventAnalytics, type AdminEventAnalytics } from '@/services/eventService';
import type { EventStatus } from '@/types/event';
import { getOrganizers } from '@/services/organizerService';
import { getVendorProfilesByStatus } from '@/services/vendorService';
import NotificationBell from '@/components/layout/NotificationBell';

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
  const [profileCounts, setProfileCounts] = useState<{ pendingOrganizers: number; pendingVendors: number } | null>(null);
  const [profileError, setProfileError] = useState('');

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
    Promise.all([getOrganizers(), getVendorProfilesByStatus('PENDING_REVIEW')])
      .then(([organizersResponse, vendorsResponse]) => {
        if (active) {
          setProfileCounts({
            pendingOrganizers: organizersResponse.data.data.filter(person => person.profileApprovalStatus === 'PENDING_APPROVAL').length,
            pendingVendors: vendorsResponse.data.data.length,
          });
        }
      })
      .catch(err => {
        if (active) {
          setProfileError(axios.isAxiosError(err)
            ? (err.response?.data?.message ?? 'Profile review counts could not be loaded.')
            : 'Profile review counts could not be loaded.');
        }
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
              label: 'Profile review',
              to: '/admin/users',
              icon: <UsersIcon />,
              children: [
                { label: 'Organizer profiles awaiting review', to: '/admin/users/organizers/pending' },
                { label: 'Vendor profiles awaiting review', to: '/admin/users/vendors/pending' },
              ],
            },
            {
              label: 'Approved profiles',
              to: '/admin/user-accounts',
              icon: <UsersIcon />,
              children: [
                { label: 'Approved organizers', to: '/admin/users/organizers' },
                { label: 'Approved vendors', to: '/admin/users/vendors' },
              ],
            },
            { label: 'Administrator accounts', to: '/admin/accounts', icon: <UsersIcon /> },
            { label: 'Audit history', to: '/admin/audit', icon: <UsersIcon /> },
          ]}
        />

        <section className="flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <DashboardHeader
                title="Admin Dashboard"
                subtitle="Platform overview and profile review"
                breadcrumbs={[{ label: 'Dashboard', to: '/admin' }]}
                appearance="analytics"
              />
            </div>
            <NotificationBell />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Organizer profiles awaiting review" value={profileCounts?.pendingOrganizers ?? (profileError ? '—' : '…')} icon={<UsersIcon />} color="brand" appearance="analytics" />
            <StatCard label="Vendor profiles awaiting review" value={profileCounts?.pendingVendors ?? (profileError ? '—' : '…')} icon={<UsersIcon />} color="purple" appearance="analytics" />
            <StatCard label="Published events" value={eventAnalytics?.statusCounts.find(({ status }) => status === 'PUBLISHED')?.count ?? (loadingEventAnalytics ? '…' : '—')} icon={<CalIcon />} color="emerald" appearance="analytics" />
            <StatCard label="Total events" value={eventAnalytics?.statusCounts.reduce((sum, item) => sum + item.count, 0) ?? (loadingEventAnalytics ? '…' : '—')} icon={<TicketIcon />} color="amber" appearance="analytics" />
          </div>
          {profileError && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</p>}
          {eventAnalyticsError && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{eventAnalyticsError}</p>}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <section className="dashboard-panel p-6">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Event overview</span>
                <h2 className="text-xl font-black text-neutral-900 mt-1">Total events</h2>
              </div>
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
              {loadingEventAnalytics ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : eventAnalytics && (
                <PublishedEventsBarChart publishedByCategory={eventAnalytics.publishedByCategory} />
              )}
            </section>
          </div>

          <div className="dashboard-panel p-6">
            <h2 className="text-xl font-black text-neutral-900">Administration</h2>
            <p className="mt-1 text-sm text-neutral-500">Review profiles, manage administrator access, and inspect system audit history.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/admin/users/organizers/pending" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">Review organizer profiles</Link>
              <Link to="/admin/users/vendors/pending" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">Review vendor profiles</Link>
              <Link to="/admin/accounts" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">Administrator accounts</Link>
              <Link to="/admin/audit" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">Audit history</Link>
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
