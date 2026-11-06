import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import UserManagementNav from '@/components/admin/UserManagementNav';
import {
  approveOrganizerProfile,
  deleteOrganizerAccount,
  getOrganizers,
  rejectOrganizerProfile,
  type ManagedOrganizer,
} from '@/services/organizerService';
import type { ProfileApprovalStatus } from '@/types/user';

export default function UserManagement({ profileStatus }: { profileStatus?: ProfileApprovalStatus }) {
  const [organizers, setOrganizers] = useState<ManagedOrganizer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [organizerToReject, setOrganizerToReject] = useState<ManagedOrganizer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    ).filter(person => !profileStatus || person.profileApprovalStatus === profileStatus);
  }, [organizers, profileStatus, search]);

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

  const handleRejectProfile = async () => {
    if (!organizerToReject) return;
    setError('');
    setNotice('');
    setRejectingId(organizerToReject.id);
    try {
      const response = await rejectOrganizerProfile(organizerToReject.id, rejectionReason.trim());
      setNotice(response.data.message);
      setOrganizerToReject(null);
      setRejectionReason('');
      const organizersResponse = await getOrganizers();
      setOrganizers(organizersResponse.data.data);
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Organizer profile could not be rejected.')
        : 'Organizer profile could not be rejected.');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeleteAccount = async (person: ManagedOrganizer) => {
    const confirmed = window.confirm(
      `Permanently delete ${person.firstname} ${person.lastname}'s account, events, registrations, and related records? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingId(person.id);
    try {
      const response = await deleteOrganizerAccount(person.id);
      setNotice(response.data.message);
      const organizersResponse = await getOrganizers();
      setOrganizers(organizersResponse.data.data);
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Organizer account could not be deleted.')
        : 'Organizer account could not be deleted.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageWrapper>
      <div className="grid grid-cols-1">
        {profileStatus !== 'APPROVED' && <UserManagementNav />}
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">Accounts</span>
              <h2 className="text-xl font-black text-neutral-900 mt-1">
                {profileStatus === 'PENDING_APPROVAL'
                  ? 'Organizer profiles awaiting approval'
                  : profileStatus === 'APPROVED' ? 'Approved organizer profiles' : 'Organizer directory'}
              </h2>
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

          {loading ? <div className="py-8 flex justify-center"><Spinner /></div> : profileStatus === 'PENDING_APPROVAL' && filteredOrganizers.length === 0 ? (
            <p className="py-8 text-sm text-neutral-500">No organizer profiles are awaiting approval.</p>
          ) : profileStatus === 'APPROVED' && filteredOrganizers.length === 0 ? (
            <p className="py-8 text-sm text-neutral-500">No approved organizer profiles.</p>
          ) : !profileStatus && organizers.length === 0 ? (
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
                    {person.organizationEmail && (
                      <p className="text-sm text-neutral-500">
                        Organization email: {person.organizationEmail}
                      </p>
                    )}
                    {person.organizationRegistrationNumber && (
                      <p className="text-sm text-neutral-500">
                        Registration number: {person.organizationRegistrationNumber}
                      </p>
                    )}
                    {person.phone && <p className="text-sm text-neutral-500">Phone: {person.phone}</p>}
                    {person.organizationDescription && (
                      <p className="mt-1 max-w-prose text-sm text-neutral-500">{person.organizationDescription}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {profileStatus === 'APPROVED' && (
                      <>
                        <Badge variant={person.isActive ? 'success' : 'danger'}>
                          {person.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deletingId === person.id}
                          disabled={Boolean(deletingId)}
                          onClick={() => void handleDeleteAccount(person)}
                        >
                          DELETE ACCOUNT
                        </Button>
                      </>
                    )}
                    {profileStatus !== 'APPROVED' && person.profileApprovalStatus === 'PENDING_APPROVAL' && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={rejectingId === person.id}
                          disabled={Boolean(approvingId || rejectingId)}
                          onClick={() => { setOrganizerToReject(person); setRejectionReason(''); }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          loading={approvingId === person.id}
                          disabled={!person.organizationName?.trim() || Boolean(approvingId || rejectingId)}
                          onClick={() => void handleApproveProfile(person)}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(organizerToReject)}
        onClose={() => {
          if (!rejectingId) setOrganizerToReject(null);
        }}
        title="Reject organizer profile"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Explain what needs to be corrected. This feedback will be shown to {organizerToReject?.firstname} on their profile.
          </p>
          <textarea
            rows={5}
            maxLength={2000}
            value={rejectionReason}
            onChange={event => setRejectionReason(event.target.value)}
            placeholder="Describe what needs to change (at least 10 characters)…"
            className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-neutral-500">{rejectionReason.trim().length}/2000 characters</p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={Boolean(rejectingId)}
              onClick={() => setOrganizerToReject(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={Boolean(rejectingId)}
              disabled={rejectionReason.trim().length < 10}
              onClick={() => void handleRejectProfile()}
            >
              Confirm rejection
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
