import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/useAuth';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { createManagedAdmin, getManagedAdmins, updateManagedAdminStatus, type ManagedAdmin } from '@/services/adminService';

export default function AdminAccounts() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState({ firstname: '', lastname: '', email: '' });
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAdmins = () => getManagedAdmins()
    .then(response => {
      setAdmins(response.data.data);
      setAccountsError('');
    })
    .catch(err => setAccountsError(axios.isAxiosError(err)
      ? (err.response?.data?.message ?? 'Administrator accounts could not be loaded.')
      : 'Administrator accounts could not be loaded.'))
    .finally(() => setLoading(false));

  useEffect(() => { void loadAdmins(); }, []);

  const handleCreateAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const response = await createManagedAdmin(admin);
      setNotice(response.data.message ?? 'Administrator created and invitation sent.');
      setAdmin({ firstname: '', lastname: '', email: '' });
      await loadAdmins();
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Administrator account could not be created.')
        : 'Administrator account could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (person: ManagedAdmin) => {
    setError('');
    setNotice('');
    try {
      await updateManagedAdminStatus(person.id, !person.isActive);
      setAdmins(current => current.map(admin => admin.id === person.id ? { ...admin, isActive: !person.isActive } : admin));
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Administrator status could not be updated.')
        : 'Administrator status could not be updated.');
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col lg:flex-row gap-8">
        <DashboardSidebar
          title="Admin"
          subtitle="Administration"
          items={[
            { label: 'Overview', to: '/admin', icon: <DashboardIcon /> },
            { label: 'Administrator accounts', to: '/admin/accounts', icon: <UsersIcon /> },
            { label: 'Audit history', to: '/admin/audit', icon: <KeyIcon /> },
          ]}
        />
        <section className="flex-1 min-w-0">
          <DashboardHeader
            title="Administrator accounts"
            subtitle="Create and manage administrator access."
            breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Administrator accounts' }]}
          />

          {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {accountsError && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{accountsError}</p>}
          {notice && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Admin access</span>
                <h2 className="text-xl font-black text-neutral-900 mt-1">Create administrator</h2>
              </div>
              <form onSubmit={handleCreateAdmin}>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="First name" autoComplete="given-name" value={admin.firstname} onChange={event => setAdmin({ ...admin, firstname: event.target.value })} required />
                  <Input label="Last name" autoComplete="family-name" value={admin.lastname} onChange={event => setAdmin({ ...admin, lastname: event.target.value })} required />
                  <Input label="Email address" type="email" autoComplete="email" value={admin.email} onChange={event => setAdmin({ ...admin, email: event.target.value })} required />
                </div>
                <p className="mt-3 text-xs text-neutral-500">A temporary password will be emailed. The new administrator must replace it at first sign-in.</p>
                <div className="mt-5 flex justify-end">
                  <Button type="submit" loading={saving}>Create administrator</Button>
                </div>
              </form>
            </section>

            <section className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Platform users</span>
                  <h2 className="text-xl font-black text-neutral-900 mt-1">Administrator directory</h2>
                </div>
                <Badge variant="success">{loading || accountsError ? '—' : admins.filter(person => person.isActive).length} active</Badge>
              </div>
              {loading ? <div className="py-8 flex justify-center"><Spinner /></div> : accountsError ? null : admins.length === 0 ? (
                <p className="py-8 text-sm text-neutral-500">No administrator accounts yet.</p>
              ) : (
                <div className="divide-y divide-neutral-100 mt-4">
                  {admins.map(person => (
                    <div key={person.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-black text-neutral-900 truncate">{person.firstname} {person.lastname}</p>
                        <p className="text-xs text-neutral-500 truncate">{person.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={person.isActive ? 'success' : 'danger'}>{person.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                        {person.mustChangePassword && <Badge variant="warning">SETUP PENDING</Badge>}
                        <button
                          type="button"
                          disabled={person.id === user?.id}
                          title={person.id === user?.id ? 'You cannot deactivate your own account.' : undefined}
                          className="text-xs font-semibold text-brand-700 disabled:cursor-not-allowed disabled:text-neutral-400"
                          onClick={() => void handleStatus(person)}
                        >
                          {person.id === user?.id ? 'Current account' : person.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

const DashboardIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h10a2 2 0 002-2V10" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const KeyIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a4 4 0 000 8h1.5m0 0l3 3M16.5 11H21" /></svg>;
