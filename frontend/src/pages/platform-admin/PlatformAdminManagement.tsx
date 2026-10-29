import { useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { createManagedAdmin, getManagedAdmins, updateManagedAdminStatus, type ManagedAdmin } from '@/services/platformAdminService';
import { EmptyState, ErrorBanner } from '@/pages/platform-admin/components/PlatformAdminShared';

const EMPTY_ADMIN = { firstname: '', lastname: '', email: '' };

export default function PlatformAdminManagement() {
  const [form, setForm] = useState(EMPTY_ADMIN);
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAdmins = async () => {
    const response = await getManagedAdmins();
    setAdmins(response.data.data);
  };

  useEffect(() => {
    let active = true;
    getManagedAdmins()
      .then(response => { if (active) setAdmins(response.data.data); })
      .catch(err => {
        if (active) setError(getErrorMessage(err, 'Administrator accounts could not be loaded.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return admins;
    return admins.filter(admin =>
      `${admin.firstname} ${admin.lastname}`.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query),
    );
  }, [admins, search]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const response = await createManagedAdmin({
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim(),
      });
      setNotice(response.data.message ?? 'Administrator created and invitation sent.');
      setForm(EMPTY_ADMIN);
      try {
        await loadAdmins();
      } catch {
        setError('Administrator was created, but the account directory could not be refreshed.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Administrator account could not be created.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (admin: ManagedAdmin) => {
    setError('');
    setNotice('');
    setUpdatingId(admin.id);
    try {
      await updateManagedAdminStatus(admin.id, !admin.isActive);
      setAdmins(current => current.map(item => item.id === admin.id ? { ...item, isActive: !admin.isActive } : item));
      setNotice(`${admin.firstname} ${admin.lastname}'s account is now ${admin.isActive ? 'inactive' : 'active'}.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Administrator status could not be updated.'));
    } finally {
      setUpdatingId('');
    }
  };

  const activeCount = admins.filter(admin => admin.isActive).length;
  const setupCount = admins.filter(admin => admin.mustChangePassword).length;

  return (
    <div className="space-y-6">
      {(error || notice) && (
        <div className="space-y-3">
          {error && <ErrorBanner message={error} />}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total administrators" value={admins.length} />
        <SummaryCard label="Active accounts" value={activeCount} />
        <SummaryCard label="First sign-in pending" value={setupCount} />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.5fr)]">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Provision access</p>
            <h2 className="mt-1.5 text-lg font-bold text-neutral-900">Create administrator</h2>
            <p className="mt-1 text-sm leading-5 text-neutral-500">Send a secure invitation with a one-time setup password.</p>
          </div>
          <form onSubmit={event => void handleCreate(event)} className="space-y-4">
            <Input label="First name" autoComplete="given-name" maxLength={100} value={form.firstname} onChange={event => setForm({ ...form, firstname: event.target.value })} required />
            <Input label="Last name" autoComplete="family-name" maxLength={100} value={form.lastname} onChange={event => setForm({ ...form, lastname: event.target.value })} required />
            <Input label="Work email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
            <div className="rounded-xl bg-neutral-50 px-3.5 py-3 text-xs leading-5 text-neutral-500">
              The invitee must change their temporary password before accessing their account.
            </div>
            <Button type="submit" loading={saving} className="w-full">Create administrator</Button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">Directory</p>
              <h2 className="mt-1 text-lg font-bold text-neutral-900">Administrator accounts</h2>
            </div>
            <div className="w-full sm:max-w-xs">
              <Input aria-label="Search administrators" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><Spinner /></div>
          ) : admins.length === 0 ? (
            <EmptyState title="No administrators yet" description="Create an administrator account to get started." />
          ) : filteredAdmins.length === 0 ? (
            <EmptyState title="No matching accounts" description="Try a different name or email address." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredAdmins.map(admin => (
                <div key={admin.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {admin.firstname[0]}{admin.lastname[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{admin.firstname} {admin.lastname}</p>
                      <p className="truncate text-xs text-neutral-500">{admin.email}</p>
                      <p className="mt-1 text-[11px] text-neutral-400">Added {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(admin.createdAt))}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {admin.mustChangePassword && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Setup pending</span>}
                    <button
                      type="button"
                      disabled={updatingId === admin.id}
                      aria-label={`${admin.isActive ? 'Deactivate' : 'Activate'} ${admin.firstname} ${admin.lastname}`}
                      onClick={() => void handleStatusChange(admin)}
                      className="ml-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50"
                    >
                      {updatingId === admin.id ? 'Updating…' : admin.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 bg-neutral-50/70 px-5 py-3 text-xs text-neutral-500 sm:px-6">
            <span>Showing {filteredAdmins.length} of {admins.length} administrators</span>
            <Link to="/platform-admin/audit" className="font-semibold text-brand-700 hover:text-brand-900">Review changes in audit history</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-neutral-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">{value}</p></div>;
}

function getErrorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? (error.response?.data?.message ?? fallback) : fallback;
}
