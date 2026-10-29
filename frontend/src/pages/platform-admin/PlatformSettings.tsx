import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function PlatformSettings() {
  const { user } = useAuth();

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Account</p>
          <h2 className="mt-1.5 text-lg font-bold text-neutral-900">Platform administrator profile</h2>
          <p className="mt-1 text-sm text-neutral-500">Your signed-in identity and role for this workspace.</p>
        </div>
        <dl className="divide-y divide-neutral-100 px-5 sm:px-6">
          <SettingRow label="Name" value={`${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim() || '—'} />
          <SettingRow label="Email address" value={user?.email ?? '—'} />
          <SettingRow label="Access role" value="Platform administrator" />
          <SettingRow label="Account status" value={user?.isActive === false ? 'Inactive' : 'Active'} />
          <SettingRow label="Member since" value={user?.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(user.createdAt)) : '—'} />
        </dl>
      </section>

      <section className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <LockIcon />
          </div>
          <h2 className="mt-4 text-base font-bold text-neutral-900">Password & security</h2>
          <p className="mt-1.5 text-sm leading-6 text-neutral-500">Keep your privileged account protected with a strong, unique password.</p>
          <Link to="/change-password" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800">
            Change password <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Access boundary</p>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">This workspace is for platform operations. Account access changes are audited; event and attendee business data remain outside this admin console.</p>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"><dt className="text-sm text-neutral-500">{label}</dt><dd className="break-all text-sm font-semibold text-neutral-800 sm:text-right">{value}</dd></div>;
}

function LockIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 10V7a5 5 0 0110 0v3m-12 0h14v11H5V10z" /></svg>;
}
