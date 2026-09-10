import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

const platformAdmins = [
  { id: 'A-1001', name: 'Olivia Mokoena', email: 'olivia@eventms.co.za', status: 'ACTIVE', role: 'Platform Admin' },
  { id: 'A-1002', name: 'Samuel Ndlovu', email: 'samuel@eventms.co.za', status: 'ACTIVE', role: 'Platform Admin' },
];

export default function PlatformSettings() {
  const [admin, setAdmin] = useState({ firstname: '', lastname: '', email: '', title: '' });

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Platform Admin"
          subtitle="Administration"
          items={[
            { label: 'Dashboard', to: '/platform-admin', icon: <DashboardIcon /> },
            { label: 'Register admins', to: '/platform-admin/admins', icon: <UsersIcon /> },
            { label: 'Settings', to: '/platform-admin/settings', icon: <SettingsIcon /> },
            { label: 'Account recovery', to: '/platform-admin/account-recovery', icon: <KeyIcon /> },
          ]}
        />

        <section className="flex-1">
          <DashboardHeader
            title="Platform Admin Dashboard"
            subtitle="Platform governance and admin provisioning"
            breadcrumbs={[{ label: 'Dashboard', to: '/platform-admin' }]}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,1.2fr)_minmax(360px,0.9fr)] gap-6 mb-8">
            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Admin access</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Register platform admin</h2>
                </div>
                <span className="rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-[11px] font-black uppercase tracking-wide">System</span>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First name" value={admin.firstname} onChange={e => setAdmin({ ...admin, firstname: e.target.value })} />
                <Input label="Last name" value={admin.lastname} onChange={e => setAdmin({ ...admin, lastname: e.target.value })} />
                <Input label="Email address" type="email" value={admin.email} onChange={e => setAdmin({ ...admin, email: e.target.value })} />
                <Input label="Role title" value={admin.title} onChange={e => setAdmin({ ...admin, title: e.target.value })} />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <Button variant="secondary">Cancel</Button>
                <Button>Create admin</Button>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Platform users</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Admin directory</h2>
                </div>
                <Badge variant="success">{platformAdmins.length} active</Badge>
              </div>

              <div className="divide-y divide-neutral-100 mt-4">
                {platformAdmins.map(person => (
                  <div key={person.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-black text-neutral-900 truncate">{person.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{person.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="info">{person.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-6 max-w-3xl">
            <SettingsSection title="General" description="Basic platform information.">
              <Input label="Platform name" defaultValue="EventMS" />
              <Input label="Support email" type="email" defaultValue="support@eventms.co.za" />
              <Input label="Default currency" defaultValue="ZAR" />
            </SettingsSection>

            <SettingsSection title="Registration" description="Control how users register on the platform.">
              <div className="flex flex-col gap-3">
                <ToggleRow label="Allow public registration" description="New users can create accounts without an invitation." defaultChecked />
                <ToggleRow label="Require email verification" description="Users must verify their email before accessing the platform." />
                <ToggleRow label="Allow vendor self-registration" description="Vendors can register without admin approval." defaultChecked />
              </div>
            </SettingsSection>

            <SettingsSection title="Events" description="Default behaviour for event creation and approval.">
              <div className="flex flex-col gap-3">
                <ToggleRow label="Require admin approval for events" description="All events must be approved before being published." defaultChecked />
                <ToggleRow label="Allow free events" description="Organisers can create events with no ticket price." defaultChecked />
              </div>
              <Input label="Max event capacity" type="number" defaultValue="1000" />
            </SettingsSection>

            <div className="flex justify-end">
              <Button>Save settings</Button>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-neutral-800 group-hover:text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
      </div>
      <div className="relative shrink-0 mt-0.5">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-10 h-6 bg-neutral-200 rounded-full peer-checked:bg-brand-600 transition-colors" />
        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
      </div>
    </label>
  );
}

const DashboardIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const KeyIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a4 4 0 000 8h1.5m0 0l3 3M16.5 11H21" /></svg>;
