import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import {
  approveOrganizerProfile,
  deleteOrganizerAccount,
  getOrganizers,
  rejectOrganizerProfile,
  type ManagedOrganizer,
} from '@/services/organizerService';
import type { ProfileApprovalStatus } from '@/types/user';

type OrganizerTab = 'Pending' | 'Approved' | 'Rejected' | 'Inactive';

const organizerTabs: OrganizerTab[] = ['Pending', 'Approved', 'Rejected', 'Inactive'];

export default function UserManagement({ profileStatus }: { profileStatus?: ProfileApprovalStatus }) {
  const [organizers, setOrganizers] = useState<ManagedOrganizer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<OrganizerTab>(profileStatus === 'APPROVED' ? 'Approved' : 'Pending');
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [organizerToReject, setOrganizerToReject] = useState<ManagedOrganizer | null>(null);
  const [organizerToDelete, setOrganizerToDelete] = useState<ManagedOrganizer | null>(null);
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
      person.email.toLowerCase().includes(query) ||
      person.organizationName?.toLowerCase().includes(query),
    ).filter(person => {
      if (selectedTab === 'Pending') return person.profileApprovalStatus === 'PENDING_APPROVAL';
      if (selectedTab === 'Rejected') return person.profileApprovalStatus === 'REJECTED';
      if (selectedTab === 'Inactive') return person.profileApprovalStatus === 'APPROVED' && !person.isActive;
      return person.profileApprovalStatus === 'APPROVED' && person.isActive;
    });
  }, [organizers, search, selectedTab]);

  const selectedOrganizer = filteredOrganizers.find(person => person.id === selectedOrganizerId) ?? filteredOrganizers[0] ?? null;

  const tabCounts: Record<OrganizerTab, number> = {
    Pending: organizers.filter(person => person.profileApprovalStatus === 'PENDING_APPROVAL').length,
    Approved: organizers.filter(person => person.profileApprovalStatus === 'APPROVED' && person.isActive).length,
    Rejected: organizers.filter(person => person.profileApprovalStatus === 'REJECTED').length,
    Inactive: organizers.filter(person => person.profileApprovalStatus === 'APPROVED' && !person.isActive).length,
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

  const handleDeleteAccount = async () => {
    if (!organizerToDelete) return;
    setError('');
    setNotice('');
    setDeletingId(organizerToDelete.id);
    try {
      const response = await deleteOrganizerAccount(organizerToDelete.id);
      setNotice(response.data.message);
      setOrganizerToDelete(null);
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
    <>
      <div className="min-w-0">
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm !text-emerald-800">{notice}</p>}

        <div className="mb-5 flex flex-wrap gap-2 rounded-[16px] border border-[#e5e7eb] bg-[#f2f3f2] p-1.5" role="tablist" aria-label="Organizer status">
          {organizerTabs.map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selectedTab === tab}
              onClick={() => {
                setSelectedTab(tab);
                setSearch('');
                setSelectedOrganizerId(null);
              }}
              className={`flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[15px] font-medium transition-colors ${
                selectedTab === tab ? 'bg-[#e6e7e8] text-[#1f2937] shadow-sm' : 'text-[#65707d] hover:bg-white/70 hover:text-[#1f2937]'
              }`}
            >
              <span>{tab}</span>
              {tabCounts[tab] > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-bold text-[#374151]">{tabCounts[tab]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid min-h-[560px] grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
          <section aria-label={`${selectedTab} organizers`} className="min-w-0 rounded-[20px] border border-[#e5e7eb] bg-white p-3">
            <div className="mb-3 px-1">
              <Input
                aria-label="Search organizers"
                placeholder="Search organizers"
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setSelectedOrganizerId(null);
                }}
              />
            </div>
            {loading ? <div className="flex justify-center py-8"><Spinner /></div> : filteredOrganizers.length === 0 ? (
              <p className="px-3 py-8 text-sm text-neutral-500">
                {search ? 'No organizers match your search.' : `No ${selectedTab.toLowerCase()} organizers.`}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredOrganizers.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={selectedOrganizer?.id === person.id}
                    onClick={() => setSelectedOrganizerId(person.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[16px] border p-3.5 text-left transition-colors ${
                      selectedOrganizer?.id === person.id
                        ? 'border-[#e1e5e9] bg-[#f4f6f8]'
                        : 'border-transparent bg-white hover:border-[#e1e5e9] hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5ad1c3] text-[16px] font-bold text-white">
                        {getInitials(person.organizationName || `${person.firstname} ${person.lastname}`)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[17px] font-bold text-[#1f2937]">
                          {person.organizationName?.trim() || `${person.firstname} ${person.lastname}`}
                        </span>
                        <span className="mt-1 block truncate text-[13px] text-[#5f6b7a]">
                          {person.organizationEmail || person.email}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#f0f1f4] px-2.5 py-1 text-[12px] font-medium text-[#4b5563]">
                      {formatAge(person.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Organizer details" className="min-w-0 rounded-[20px] border border-[#e5e7eb] bg-white p-5 sm:p-6">
            {selectedOrganizer ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4fc3b1] text-[18px] font-bold text-white">
                      {getInitials(selectedOrganizer.organizationName || `${selectedOrganizer.firstname} ${selectedOrganizer.lastname}`)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[22px] font-bold text-[#1f2937]">
                        {selectedOrganizer.organizationName?.trim() || `${selectedOrganizer.firstname} ${selectedOrganizer.lastname}`}
                      </h2>
                      <p className="mt-1 truncate text-sm text-[#5f6b7a]">
                        {selectedOrganizer.firstname} {selectedOrganizer.lastname} · {selectedOrganizer.email}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-[#dfe3ea] bg-[#f0f1f4] px-3 py-1.5 text-[12px] font-semibold text-[#4b5563]">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#4b5563]" />
                    {selectedOrganizer.profileApprovalStatus === 'PENDING_APPROVAL'
                      ? 'Pending review'
                      : selectedOrganizer.profileApprovalStatus === 'REJECTED'
                        ? 'Rejected'
                        : selectedOrganizer.isActive ? 'Approved' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <OrganizerInfo label="Registration number" value={selectedOrganizer.organizationRegistrationNumber} />
                  <OrganizerInfo label="Organization email" value={selectedOrganizer.organizationEmail} />
                  <OrganizerInfo label="Phone" value={selectedOrganizer.phone} />
                </div>

                <div className="mb-5 rounded-[16px] border border-[#e5e7eb] bg-[#f9f9f9] p-4">
                  <h3 className="mb-3 text-[18px] font-bold text-[#1f2937]">Documents</h3>
                  <div className="flex min-h-[150px] items-center justify-center rounded-[12px] border border-dashed border-[#dfe3ea] bg-white px-4 text-center text-sm text-[#6b7280]">
                    No organization documents have been submitted.
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="mb-2 text-[18px] font-bold text-[#1f2937]">About</h3>
                  <p className="text-[14px] leading-6 text-[#4b5563]">
                    {selectedOrganizer.organizationDescription?.trim() || 'No organization description provided.'}
                  </p>
                </div>

                {selectedTab === 'Pending' && selectedOrganizer.profileApprovalStatus === 'PENDING_APPROVAL' && (
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-20 w-40 rounded-xl bg-black px-6 text-base font-bold leading-6 text-white shadow-sm hover:bg-neutral-500 focus-visible:ring-black"
                      loading={approvingId === selectedOrganizer.id}
                      disabled={Boolean(approvingId || rejectingId)}
                      onClick={() => void handleApproveProfile(selectedOrganizer)}
                    >
                      Approve organizer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-20 w-48 rounded-xl border border-[#d9e0ea] px-6 text-base font-bold leading-6 text-[#26354b] shadow-none hover:bg-neutral-50"
                      loading={rejectingId === selectedOrganizer.id}
                      disabled={Boolean(approvingId || rejectingId)}
                      onClick={() => { setOrganizerToReject(selectedOrganizer); setRejectionReason(''); }}
                    >
                      Reject with reason...
                    </Button>
                  </div>
                )}
                {(selectedTab === 'Approved' || selectedTab === 'Inactive') && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === selectedOrganizer.id}
                    disabled={Boolean(deletingId)}
                    onClick={() => setOrganizerToDelete(selectedOrganizer)}
                  >
                    Delete account
                  </Button>
                )}
              </>
            ) : loading ? (
              <div className="flex h-full min-h-[240px] items-center justify-center"><Spinner /></div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-[#6b7280]">
                Select an organizer to view their profile.
              </div>
            )}
          </section>
        </div>
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
      <Modal
        open={Boolean(organizerToDelete)}
        onClose={() => {
          if (!deletingId) setOrganizerToDelete(null);
        }}
        title="Confirm account deletion"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Permanently delete {organizerToDelete?.firstname} {organizerToDelete?.lastname}'s account, events, registrations, and related records? This cannot be undone.
          </p>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={Boolean(deletingId)}
              onClick={() => setOrganizerToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={Boolean(deletingId)}
              onClick={() => void handleDeleteAccount()}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function OrganizerInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 rounded-[12px] border border-[#e5e7eb] bg-[#f7f7f7] p-3.5">
      <div className="truncate text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">{label}</div>
      <div className="mt-2 truncate text-[14px] font-semibold text-[#1f2937]">{value?.trim() || 'Not provided'}</div>
    </div>
  );
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
}

function formatAge(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return '—';

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
