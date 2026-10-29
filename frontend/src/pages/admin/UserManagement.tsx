import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import PageWrapper from '@/components/layout/PageWrapper';
import { useAuth } from '@/context/AuthContext';
import { getUserById, getUsers, updateUserProfile, updateUserRole, updateUserStatus } from '@/services/userService';
import type { ManagedUser } from '@/services/userService';
import type { UserRole } from '@/types/user';
import type { BadgeVariant } from '@/components/ui/Badge';

const roleVariant: Record<string, BadgeVariant> = {
  ATTENDEE: 'success',
  ORGANIZER: 'info',
  VENDOR: 'purple',
  MANAGEMENT: 'amber',
};

const MANAGEABLE_ROLES: UserRole[] = ['ATTENDEE', 'VENDOR', 'ORGANIZER', 'MANAGEMENT'];
const EMPTY_FILTERS = { search: '', role: '', status: '', registeredFrom: '', registeredTo: '' };
const getErrorMessage = (error: unknown, fallback: string): string =>
  axios.isAxiosError<{ message?: string }>(error) && error.response?.data.message
    ? error.response.data.message
    : fallback;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [profile, setProfile] = useState({ firstname: '', lastname: '' });
  const [selectedRole, setSelectedRole] = useState<UserRole>('ATTENDEE');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<ManagedUser | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getUsers({ ...filters, page, pageSize: 25 })
      .then(response => {
        if (!active) return;
        setUsers(response.data.data);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
        setError('');
      })
      .catch(error => {
        if (active) setError(getErrorMessage(error, 'Could not load registered users. Please try again.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filters, page]);

  const updateFilter = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setPage(1);
    setFilters(current => ({ ...current, [key]: value }));
  };

  const refreshUsers = async () => {
    const response = await getUsers({ ...filters, page, pageSize: 25 });
    setUsers(response.data.data);
    setTotal(response.data.pagination.total);
    setTotalPages(response.data.pagination.totalPages);
  };

  const showUser = async (id: string) => {
    setActionError('');
    setNotice('');
    setSelectedUser(null);
    try {
      const response = await getUserById(id);
      const managedUser = response.data.data;
      setSelectedUser(managedUser);
      setProfile({ firstname: managedUser.firstname, lastname: managedUser.lastname });
      setSelectedRole(managedUser.role);
    } catch (error) {
      setError(getErrorMessage(error, 'Could not load that user profile. Refresh the list and try again.'));
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;
    setSavingProfile(true);
    setActionError('');
    setNotice('');
    try {
      const response = await updateUserProfile(selectedUser.id, {
        firstname: profile.firstname.trim(),
        lastname: profile.lastname.trim(),
      });
      setSelectedUser(response.data.data);
      setUsers(current => current.map(item => item.id === response.data.data.id ? response.data.data : item));
      setNotice('User profile updated.');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Could not update the profile. Check the names and try again.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveRole = async () => {
    if (!selectedUser || selectedRole === selectedUser.role) return;
    setSavingRole(true);
    setActionError('');
    setNotice('');
    try {
      const response = await updateUserRole(selectedUser.id, selectedRole);
      setSelectedUser(response.data.data);
      setUsers(current => current.map(item => item.id === response.data.data.id ? response.data.data : item));
      setNotice('User role updated.');
    } catch (error) {
      setActionError(getErrorMessage(error, 'Could not update the role. The account may no longer be eligible for changes.'));
    } finally {
      setSavingRole(false);
    }
  };

  const changeStatus = async () => {
    if (!confirmStatus) return;
    setSavingStatus(true);
    setActionError('');
    try {
      const response = await updateUserStatus(confirmStatus.id, !confirmStatus.isActive);
      setSelectedUser(current => current?.id === response.data.data.id ? response.data.data : current);
      setUsers(current => current.map(item => item.id === response.data.data.id ? response.data.data : item));
      setNotice(`Account ${response.data.data.isActive ? 'reinstated' : 'suspended'}.`);
      setConfirmStatus(null);
      try {
        await refreshUsers();
      } catch {
        setError('Account status was updated, but the list could not be refreshed.');
      }
    } catch (error) {
      setActionError(getErrorMessage(error, 'Could not change account status. Refresh the list and try again.'));
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">User Management</h1>
        <p className="mt-1 text-neutral-500">{total} registered user{total === 1 ? '' : 's'}</p>
      </div>

      <section aria-label="User filters" className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          aria-label="Search users"
          placeholder="Search name or email"
          value={filters.search}
          onChange={event => updateFilter('search', event.target.value)}
        />
        <label className="text-sm text-neutral-600">
          Role
          <select value={filters.role} onChange={event => updateFilter('role', event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm">
            <option value="">All roles</option>
            {MANAGEABLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label className="text-sm text-neutral-600">
          Account status
          <select value={filters.status} onChange={event => updateFilter('status', event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="text-sm text-neutral-600">
          Registered from
          <input type="date" value={filters.registeredFrom} onChange={event => updateFilter('registeredFrom', event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm text-neutral-600">
          Registered to
          <input type="date" value={filters.registeredTo} onChange={event => updateFilter('registeredTo', event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
      </section>

      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(heading => (
                  <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {users.map(managedUser => (
                <tr key={managedUser.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <button type="button" onClick={() => void showUser(managedUser.id)} className="flex items-center gap-3 text-left">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">{managedUser.firstname.charAt(0)}</span>
                      <span className="font-medium text-neutral-900">{managedUser.firstname} {managedUser.lastname}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{managedUser.email}</td>
                  <td className="px-5 py-3"><Badge variant={roleVariant[managedUser.role] ?? 'default'}>{managedUser.role}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={managedUser.isActive ? 'success' : 'danger'}>{managedUser.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-500">{new Date(managedUser.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button type="button" onClick={() => void showUser(managedUser.id)} className="text-xs font-medium text-brand-600 hover:text-brand-700">View profile</button>
                    {managedUser.id !== currentUser?.id && (
                      <>
                        <span className="mx-2 text-neutral-300">·</span>
                        <button
                          type="button"
                          onClick={() => { setActionError(''); setConfirmStatus(managedUser); }}
                          className={`text-xs font-medium ${managedUser.isActive ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                        >
                          {managedUser.isActive ? 'Suspend' : 'Reinstate'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-neutral-500">No users match these filters.</td></tr>
              )}
              {loading && users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-neutral-500">Loading users...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm text-neutral-600">
          <span>Page {page} of {Math.max(totalPages, 1)}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(current => current + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User profile" size="md">
        {selectedUser && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-neutral-500">Email</dt><dd className="font-medium text-neutral-900">{selectedUser.email}</dd></div>
              <div><dt className="text-neutral-500">Email verified</dt><dd className="font-medium text-neutral-900">{selectedUser.emailVerified ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-neutral-500">Account status</dt><dd className="font-medium text-neutral-900">{selectedUser.isActive ? 'Active' : 'Inactive'}</dd></div>
              <div><dt className="text-neutral-500">Registered</dt><dd className="font-medium text-neutral-900">{new Date(selectedUser.createdAt).toLocaleString()}</dd></div>
            </dl>
            <form onSubmit={event => void saveProfile(event)} className="space-y-4 border-t border-neutral-100 pt-4">
              <h3 className="font-semibold text-neutral-900">Permitted profile details</h3>
              <Input label="First name" required value={profile.firstname} onChange={event => setProfile(current => ({ ...current, firstname: event.target.value }))} />
              <Input label="Last name" required value={profile.lastname} onChange={event => setProfile(current => ({ ...current, lastname: event.target.value }))} />
              <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</Button>
            </form>
            <div className="space-y-3 border-t border-neutral-100 pt-4">
              <h3 className="font-semibold text-neutral-900">Role</h3>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={event => {
                    const role = MANAGEABLE_ROLES.find(availableRole => availableRole === event.target.value);
                    if (role) setSelectedRole(role);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {MANAGEABLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
                <Button size="sm" onClick={() => void saveRole()} disabled={savingRole || selectedRole === selectedUser.role}>
                  {savingRole ? 'Saving...' : 'Update role'}
                </Button>
              </div>
            </div>
            {actionError && <p role="alert" className="text-sm text-rose-600">{actionError}</p>}
            {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmStatus}
        onClose={() => !savingStatus && setConfirmStatus(null)}
        title={confirmStatus?.isActive ? 'Suspend user account?' : 'Reinstate user account?'}
        size="sm"
      >
        {confirmStatus && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              {confirmStatus.isActive
                ? `Suspending ${confirmStatus.firstname} ${confirmStatus.lastname} prevents them from signing in.`
                : `Reinstating ${confirmStatus.firstname} ${confirmStatus.lastname} restores sign-in access.`}
              {' '}This action will be recorded.
            </p>
            {actionError && <p role="alert" className="text-sm text-rose-600">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmStatus(null)} disabled={savingStatus}>Cancel</Button>
              <Button variant={confirmStatus.isActive ? 'danger' : 'primary'} size="sm" onClick={() => void changeStatus()} disabled={savingStatus}>
                {savingStatus ? 'Saving...' : confirmStatus.isActive ? 'Confirm suspension' : 'Confirm reinstatement'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
