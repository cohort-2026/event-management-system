import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Button from '@/components/legacy/Button';
import Modal from '@/components/legacy/Modal';
import Spinner from '@/components/legacy/Spinner';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/context/useAuth';
import { activateUser, deactivateUser, getUserById, getUsers, updateUserRole, type AdminUserDetail, type UserListResponse } from '@/services/userService';
import type { User, UserRole } from '@/types/user';

const PAGE_SIZE = 20;
const roles: Array<{ label: string; value: UserRole | 'ALL' }> = [
  { label: 'All accounts', value: 'ALL' },
  { label: 'Attendees', value: 'ATTENDEE' },
  { label: 'Organizers', value: 'ORGANIZER' },
  { label: 'Vendors', value: 'VENDOR' },
  { label: 'Admins', value: 'ADMIN' },
];

const roleNames: Record<UserRole, string> = { ATTENDEE: 'Attendee', ORGANIZER: 'Organizer', VENDOR: 'Vendor', ADMIN: 'Admin' };
const messageFor = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data.message ?? 'The request could not be completed.'
  : 'The request could not be completed.';

export default function UserAccounts() {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const requestId = useRef(0);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<UserListResponse['pagination']>({ page: 1, limit: PAGE_SIZE, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [role, setRole] = useState<UserRole | 'ALL'>('ALL');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>('ATTENDEE');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await getUsers({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        role: role === 'ALL' ? undefined : role,
        status: status === 'all' ? undefined : status,
      });
      if (request !== requestId.current) return;
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (loadError) {
      if (request === requestId.current) setError(messageFor(loadError));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [page, role, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers(); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers, search]);

  const viewUser = async (id: string) => {
    setSelectedUser(null);
    setDetailLoading(true);
    setError('');
    try {
      const response = await getUserById(id);
      setSelectedUser(response.data.data);
    } catch (loadError) {
      setError(messageFor(loadError));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async () => {
    if (!actionUser) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const activate = actionUser.isActive === false;
      const response = activate ? await activateUser(actionUser.id) : await deactivateUser(actionUser.id);
      setNotice(response.data.message ?? `Account ${activate ? 'activated' : 'deactivated'}.`);
      setActionUser(null);
      await loadUsers();
    } catch (actionError) {
      setError(messageFor(actionError));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async () => {
    if (!roleTarget || roleTarget.role === nextRole) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await updateUserRole(roleTarget.id, nextRole);
      setUsers(current => current.map(person => person.id === roleTarget.id ? { ...person, role: nextRole } : person));
      setSelectedUser(current => current?.id === roleTarget.id ? { ...current, role: nextRole } : current);
      setNotice(response.data.message ?? `Role changed to ${roleNames[nextRole]}.`);
      setRoleTarget(null);
      await loadUsers();
    } catch (roleError) {
      setError(messageFor(roleError));
    } finally {
      setSaving(false);
    }
  };

  const chooseRole = (value: UserRole | 'ALL') => { setRole(value); setPage(1); };
  const chooseStatus = (value: 'all' | 'active' | 'inactive') => { setStatus(value); setPage(1); };
  const onSearch = (value: string) => { setSearch(value); setPage(1); };

  return (
    <div className="min-w-0 text-[#1f2937] antialiased">
      <DashboardHeader title="People" subtitle="Search accounts, review account details, and manage access." breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'People' }]} />

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-[#e3e7ec] bg-white shadow-sm">
        <div className="border-b border-[#edf0f3] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-base font-bold">Registered accounts</h2><p className="mt-1 text-xs text-[#758091]">{pagination.total.toLocaleString('en-ZA')} accounts · roles and account status are enforced by the server</p></div>
            <button type="button" onClick={() => void loadUsers()} disabled={loading} className="rounded-lg border border-[#dfe3ea] px-3 py-2 text-xs font-semibold text-[#455064] hover:bg-[#f8f9fa] disabled:opacity-50">Refresh</button>
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Filter users by role" className="flex gap-1 overflow-x-auto rounded-xl bg-[#f4f5f6] p-1">
              {roles.map(item => <button key={item.value} type="button" role="tab" aria-selected={role === item.value} onClick={() => chooseRole(item.value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${role === item.value ? 'bg-white text-[#273142] shadow-sm' : 'text-[#687385] hover:text-[#273142]'}`}>{item.label}</button>)}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative"><span className="sr-only">Search users</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]"><SearchIcon /></span><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Name, email or organization" className="h-10 w-full rounded-lg border border-[#dfe3ea] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#d14d74] focus:ring-2 focus:ring-[#f7dfe4] sm:w-64" /></label>
              <select aria-label="Filter by account status" value={status} onChange={event => chooseStatus(event.target.value as typeof status)} className="h-10 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#455064] outline-none focus:ring-2 focus:ring-[#f7dfe4]"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>
          </div>
        </div>

        {loading ? <div role="status" className="flex min-h-60 items-center justify-center"><Spinner /></div> : users.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-[#f8f9fa] text-[10px] font-bold uppercase tracking-[0.1em] text-[#758091]"><tr><th className="px-5 py-3">Person</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Account status</th><th className="px-4 py-3">Joined</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-[#edf0f3]">
                  {users.map(person => <tr key={person.id} className="transition hover:bg-[#fcfcfd]"><td className="px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><Avatar name={`${person.firstname} ${person.lastname}`} /><div className="min-w-0"><p className="truncate font-semibold text-[#273142]">{person.firstname} {person.lastname}</p><p className="truncate text-xs text-[#758091]">{person.email}</p></div></div></td><td className="px-4 py-3.5"><span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-xs font-semibold text-[#526071]">{roleNames[person.role]}</span></td><td className="px-4 py-3.5"><AccountStatus active={person.isActive !== false} /></td><td className="px-4 py-3.5 text-xs text-[#667085]">{new Date(person.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="px-5 py-3.5"><div className="flex justify-end gap-2"><button type="button" onClick={() => void viewUser(person.id)} className="rounded-lg border border-[#dfe3ea] px-3 py-1.5 text-xs font-semibold text-[#455064] hover:bg-[#f8f9fa]">Details</button>{person.id !== currentUser?.id && <button type="button" onClick={() => setActionUser(person)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${person.isActive === false ? 'bg-[#edf7f3] text-[#26745f] hover:bg-[#e3f2ec]' : 'bg-[#fff4f2] text-[#a64a3e] hover:bg-[#ffebe7]'}`}>{person.isActive === false ? 'Activate' : 'Deactivate'}</button>}</div></td></tr>)}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f3] px-4 py-3 sm:px-5"><p className="text-xs text-[#758091]">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total.toLocaleString('en-ZA')}</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</Button><span className="self-center px-2 text-xs font-semibold text-[#536071]">{pagination.page} / {Math.max(1, pagination.totalPages)}</span><Button size="sm" variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(current => current + 1)}>Next</Button></div></footer>
          </>
        ) : <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f5f6] text-[#748092]"><UsersIcon /></span><h3 className="mt-4 text-sm font-bold">No accounts found</h3><p className="mt-1 text-xs text-[#758091]">Try another search or adjust the role and status filters.</p></div>}
      </section>

      <Modal open={detailLoading || Boolean(selectedUser)} onClose={() => { if (!detailLoading) setSelectedUser(null); }} title="Account details" size="md">
        {detailLoading ? <div className="flex justify-center py-10"><Spinner /></div> : selectedUser && <UserDetails person={selectedUser} canChangeRole={selectedUser.id !== currentUser?.id} onChangeRole={() => { setNextRole(selectedUser.role); setRoleTarget(selectedUser); }} />}
      </Modal>
      <Modal open={Boolean(actionUser)} onClose={() => { if (!saving) setActionUser(null); }} title={`${actionUser?.isActive === false ? 'Activate' : 'Deactivate'} account`} size="sm">
        {actionUser && <div className="space-y-4"><p className="text-sm leading-6 text-[#5f6b7a]">{actionUser.isActive === false ? 'Restore access for' : 'Remove account access for'} <strong className="text-[#273142]">{actionUser.firstname} {actionUser.lastname}</strong> ({actionUser.email})?</p><p className="rounded-lg bg-[#f7f8fa] p-3 text-xs leading-5 text-[#667085]">This changes the account status. The user’s role, event history, and related records remain unchanged.</p><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={() => setActionUser(null)}>Cancel</Button><Button variant={actionUser.isActive === false ? 'primary' : 'danger'} size="sm" loading={saving} onClick={() => void changeStatus()}>{actionUser.isActive === false ? 'Activate account' : 'Deactivate account'}</Button></div></div>}
      </Modal>
      <Modal open={Boolean(roleTarget)} onClose={() => { if (!saving) setRoleTarget(null); }} title="Change account role" size="sm">
        {roleTarget && <div className="space-y-4"><p className="text-sm leading-6 text-[#5f6b7a]">Choose a new role for <strong className="text-[#273142]">{roleTarget.firstname} {roleTarget.lastname}</strong>. The server will apply the existing profile approval rules for that role.</p><label className="block text-xs font-semibold text-[#4d596b]">New role<select value={nextRole} onChange={event => setNextRole(event.target.value as UserRole)} className="mt-1.5 h-10 w-full rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm text-[#273142]"><option value="ATTENDEE">Attendee</option><option value="ORGANIZER">Organizer</option><option value="VENDOR">Vendor</option><option value="ADMIN">Admin</option></select></label><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" disabled={saving} onClick={() => setRoleTarget(null)}>Cancel</Button><Button size="sm" loading={saving} disabled={nextRole === roleTarget.role} onClick={() => void changeRole()}>Confirm role change</Button></div></div>}
      </Modal>
    </div>
  );
}

function UserDetails({ person, canChangeRole, onChangeRole }: { person: AdminUserDetail; canChangeRole: boolean; onChangeRole: () => void }) {
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] p-4"><div className="flex min-w-0 items-center gap-3"><Avatar name={`${person.firstname} ${person.lastname}`} size="lg" /><div className="min-w-0"><h3 className="truncate font-bold text-[#273142]">{person.firstname} {person.lastname}</h3><p className="break-all text-sm text-[#687385]">{person.email}</p></div></div>{canChangeRole && <Button variant="secondary" size="sm" onClick={onChangeRole}>Change role</Button>}</div><dl className="grid gap-3 sm:grid-cols-2"><Detail label="Role" value={roleNames[person.role]} /><Detail label="Account status" value={person.isActive === false ? 'Inactive' : 'Active'} /><Detail label="Email verified" value={person.emailVerified ? 'Yes' : 'No'} /><Detail label="Joined" value={new Date(person.createdAt).toLocaleDateString('en-ZA', { dateStyle: 'medium' })} />{person.phone && <Detail label="Phone" value={person.phone} />}{person.organizationName && <Detail label="Organization" value={person.organizationName} />}{person.organizationEmail && <Detail label="Organization email" value={person.organizationEmail} />}{person.profileApprovalStatus && <Detail label="Organizer profile" value={humanize(person.profileApprovalStatus)} />}{person.vendorProfile && <Detail label="Vendor profile" value={humanize(person.vendorProfile.status)} />}{person.vendorProfile?.businessName && <Detail label="Business" value={person.vendorProfile.businessName} />}</dl>{person.profileRejectionReason && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">Organizer review note</p><p className="mt-1 text-sm text-amber-900">{person.profileRejectionReason}</p></div>}</div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[#edf0f3] bg-white p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#758091]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#273142]">{value}</dd></div>; }
function AccountStatus({ active }: { active: boolean }) { return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? 'bg-[#e8f6f0] text-[#28745e]' : 'bg-[#f1f2f4] text-[#697586]'}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#35a17d]' : 'bg-[#9aa3af]'}`} />{active ? 'Active' : 'Inactive'}</span>; }
function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) { const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); return <span className={`${size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'} flex shrink-0 items-center justify-center rounded-full bg-[#f5e8ed] font-bold text-[#923b58]`}>{initials || 'U'}</span>; }
function humanize(value: string) { return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20m6-8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 8v-1.5a4 4 0 0 0-3-3.87M17 4.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
