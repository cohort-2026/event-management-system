import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import { getMyStaffMembers } from '@/services/vendorService';
import type { VendorStaffWithEvent } from '@/types/vendor';

const sidebarItems = [
  { label: 'Overview', to: '/vendor', icon: <DocumentIcon /> },
  { label: 'Business profile', to: '/vendor/profile', icon: <ProfileIcon /> },
  { label: 'Browse events', to: '/vendor/events', icon: <PlusIcon /> },
  { label: 'My applications', to: '/vendor/applications', icon: <DocumentIcon /> },
  { label: 'Staff management', to: '/vendor/staff', icon: <UsersIcon /> },
];

export default function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<VendorStaffWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyStaffMembers()
      .then(response => setStaffMembers(response.data.data))
      .catch(() => setError('Unable to load staff members. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8 lg:flex-row">
        <DashboardSidebar title="Vendor" subtitle="Operations" items={sidebarItems} />
        <section className="min-w-0 flex-1">
          <DashboardHeader title="Staff management" subtitle="Staff members listed on your approved stand applications" breadcrumbs={[{ label: 'Dashboard', to: '/vendor' }, { label: 'Staff management' }]} />

          {error && <p role="alert" className="mb-4 text-sm font-medium text-rose-700">{error}</p>}
          {loading ? (
            <p role="status" className="py-10 text-center text-neutral-500">Loading staff members…</p>
          ) : staffMembers.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">No staff members yet</h2>
              <p className="mt-2 text-sm text-neutral-600">Staff added to your stand applications will appear here with their contact email.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">Staff member</th>
                      <th scope="col" className="px-5 py-3">Contact email</th>
                      <th scope="col" className="px-5 py-3">Event</th>
                      <th scope="col" className="px-5 py-3">Entry pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {staffMembers.map(member => (
                      <tr key={member.id}>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-neutral-900">{member.name}</td>
                        <td className="px-5 py-4"><a href={`mailto:${member.email}`} className="break-all font-medium text-brand-700 hover:text-brand-900">{member.email}</a></td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-neutral-900">{member.application.event.title}</p>
                          <p className="mt-1 text-xs text-neutral-500">{member.application.event.venue} · {new Date(member.application.event.date).toLocaleDateString()}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-neutral-600">{member.entryPassId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}

function DocumentIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z" /></svg>;
}

function ProfileIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12a4 4 0 100-8 4 4 0 000 8zm7 9a7 7 0 00-14 0" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
}

function UsersIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M10 11a4 4 0 100-8 4 4 0 000 8zm7-7.87a4 4 0 010 7.75" /></svg>;
}
