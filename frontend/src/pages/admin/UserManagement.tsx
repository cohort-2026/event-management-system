import { useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import {
  approveOrganizerProfile,
  createOrganizer,
  getOrganizers,
  type ManagedOrganizer,
} from '@/services/organizerService';

interface OrganizerForm {
  firstname: string;
  lastname: string;
  email: string;
}

const EMPTY_FORM: OrganizerForm = { firstname: '', lastname: '', email: '' };

export default function UserManagement() {
  const [organizer, setOrganizer] = useState(EMPTY_FORM);
  const [organizers, setOrganizers] = useState<ManagedOrganizer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getOrganizers()
      .then(response => {
        if (active) setOrganizers(response.data.data);
      })
      .catch(err => {
        if (active) {
          setError(axios.isAxiosError(err)
            ? (err.response?.data?.message ?? 'Organizer accounts could not be loaded.')
            : 'Organizer accounts could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const filteredOrganizers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizers.filter(person =>
      `${person.firstname} ${person.lastname}`.toLowerCase().includes(query) ||
      person.email.toLowerCase().includes(query),
    );
  }, [organizers, search]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const response = await createOrganizer({
        firstname: organizer.firstname.trim(),
        lastname: organizer.lastname.trim(),
        email: organizer.email.trim(),
      });
      setNotice(response.data.message ?? 'Organizer created. A temporary password has been emailed.');
      setOrganizer(EMPTY_FORM);
      try {
        const organizersResponse = await getOrganizers();
        setOrganizers(organizersResponse.data.data);
      } catch {
        setError('Organizer created, but the directory could not be refreshed.');
      }
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Organizer account could not be created.')
        : 'Organizer account could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveProfile = async (person: ManagedOrganizer) => {
    setError('');
    setNotice('');
    setApprovingId(person.id);
    try {
      const response = await approveOrganizerProfile(person.id);
      setNotice(response.data.message);
      const organizersResponse = await getOrganizers();
      setOrganizers(organizersResponse.data.data);
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Organizer profile could not be approved.')
        : 'Organizer profile could not be approved.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Organizer Management</h1>
        <p className="text-neutral-500 mt-1">Create organizer accounts and review completed profiles before event access is granted.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.8fr)_minmax(480px,1.2fr)] gap-6">
        <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="border-b border-neutral-100 pb-4">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Organizer access</span>
            <h2 className="text-xl font-black text-neutral-900 mt-1">Create organizer account</h2>
          </div>

          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          <form onSubmit={handleCreate}>
            <div className="mt-5 flex flex-col gap-4">
              <Input
                label="First name"
                autoComplete="given-name"
                maxLength={100}
                value={organizer.firstname}
                onChange={event => setOrganizer({ ...organizer, firstname: event.target.value })}
                required
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                maxLength={100}
                value={organizer.lastname}
                onChange={event => setOrganizer({ ...organizer, lastname: event.target.value })}
                required
              />
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={organizer.email}
                onChange={event => setOrganizer({ ...organizer, email: event.target.value })}
                required
              />
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              A secure temporary password will be sent by email. The organizer must set a permanent password, complete their profile, and wait for admin approval before creating events.
            </p>
            <div className="mt-5 flex justify-end">
              <Button type="submit" loading={saving}>Create organizer</Button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Accounts</span>
              <h2 className="text-xl font-black text-neutral-900 mt-1">Organizer directory</h2>
            </div>
            <div className="w-full sm:w-64">
              <Input
                aria-label="Search organizers"
                placeholder="Search name or email"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? <div className="py-8 flex justify-center"><Spinner /></div> : organizers.length === 0 ? (
            <p className="py-8 text-sm text-neutral-500">No organizer accounts yet.</p>
          ) : filteredOrganizers.length === 0 ? (
            <p className="py-8 text-sm text-neutral-500">No organizers match your search.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredOrganizers.map(person => (
                <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">{person.firstname} {person.lastname}</p>
                    <p className="text-sm text-neutral-500 truncate">{person.email}</p>
                    <p className="mt-1 text-sm text-neutral-700">
                      Organization: {person.organizationName?.trim() || 'Not provided'}
                    </p>
                    {person.phone && <p className="text-sm text-neutral-500">Phone: {person.phone}</p>}
                    {person.organizationDescription && (
                      <p className="mt-1 max-w-prose text-sm text-neutral-500">{person.organizationDescription}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={person.isActive ? 'success' : 'danger'}>{person.isActive ? 'Active' : 'Inactive'}</Badge>
                    {person.mustChangePassword && <Badge variant="warning">Setup pending</Badge>}
                    <Badge variant={person.profileApprovalStatus === 'APPROVED' ? 'success' : 'warning'}>
                      {person.profileApprovalStatus === 'APPROVED' ? 'Profile approved' : 'Profile pending'}
                    </Badge>
                    {person.profileApprovalStatus !== 'APPROVED' && (
                      <Button
                        size="sm"
                        loading={approvingId === person.id}
                        disabled={!person.organizationName?.trim() || Boolean(approvingId)}
                        onClick={() => void handleApproveProfile(person)}
                      >
                        Approve profile
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
