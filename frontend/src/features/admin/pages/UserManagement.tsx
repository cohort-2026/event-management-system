import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Button from '@/components/legacy/Button';
import Input from '@/components/legacy/Input';
import Modal from '@/components/legacy/Modal';
import Spinner from '@/components/legacy/Spinner';
import NotificationBell from '@/layouts/NotificationBell';
import {
  approveOrganizerProfile,
  deleteOrganizerAccount,
  getOrganizers,
  rejectOrganizerProfile,
  type ManagedOrganizer,
} from '@/features/organizer/services/organizerService';
import type { ProfileApprovalStatus } from '@/types/user';
import { StatusBadge } from '@/components/shared';

type OrganizerTab = 'Pending' | 'Approved' | 'Rejected' | 'Inactive';

const organizerTabs: OrganizerTab[] = ['Pending', 'Approved', 'Rejected', 'Inactive'];

const downloadOrganizersCsv = (organizers: ManagedOrganizer[]) => {
  const columns = ['Name', 'Email', 'Organization', 'Organization email', 'Registration number', 'Phone', 'Status', 'Active', 'Created'];
  const escapeCell = (value: unknown) => {
    const text = String(value ?? '');
    const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const rows = organizers.map(person => [
    `${person.firstname} ${person.lastname}`,
    person.email,
    person.organizationName,
    person.organizationEmail,
    person.organizationRegistrationNumber,
    person.phone,
    person.profileApprovalStatus,
    person.isActive ? 'Yes' : 'No',
    person.createdAt,
  ]);
  const csv = [columns, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = 'organizers.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

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
            : err instanceof Error ? err.message : 'Organizer accounts could not be loaded.');
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
      <div className="min-w-0 rounded-[18px] border border-[#dfe3ea] bg-[#f7f7f6] p-3 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[15px] font-semibold text-[#5a6470]">Organisers</p>
          <div className="ml-auto flex w-full items-center justify-end gap-3 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-[360px] sm:flex-none">
              <Input
                aria-label="Search organizers"
                placeholder="Search organizers..."
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setSelectedOrganizerId(null);
                }}
              />
            </div>
            <button type="button" onClick={() => downloadOrganizersCsv(filteredOrganizers)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#dfe3ea] bg-white px-2.5 text-xs font-semibold text-[#374151] shadow-sm hover:bg-[#f8f8f7]" aria-label="Download organizers as CSV">
              <CsvIcon />CSV
            </button>
            <NotificationBell />
          </div>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] font-extrabold tracking-[-0.06em] text-[#1f2937] sm:text-[34px]">Organisers</h1>
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm !text-emerald-800">{notice}</p>}

        <div className="mb-5 flex gap-3 overflow-x-auto rounded-[12px] border border-[#e5e7eb] bg-[#f2f3f2] p-1" role="tablist" aria-label="Organizer status">
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
              className={`flex shrink-0 items-center gap-2 rounded-[9px] px-3 py-2 text-[14px] font-medium transition-colors ${
                selectedTab === tab ? 'bg-[#e6e7e8] text-[#1f2937] shadow-sm' : 'text-[#65707d] hover:bg-white/70 hover:text-[#1f2937]'
              }`}
            >
              <span>{tab}</span>
              {tabCounts[tab] > 0 && (
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#374151]">{tabCounts[tab]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid min-h-[560px] grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.7fr)]">
          <section aria-label={`${selectedTab} organizers`} className="min-w-0 rounded-[14px] border border-[#e5e7eb] bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            {loading ? <div className="flex justify-center py-8"><Spinner /></div> : error && organizers.length === 0 ? (
              <p role="status" className="px-3 py-8 text-sm text-rose-700">Organizer records could not be displayed.</p>
            ) : filteredOrganizers.length === 0 ? (
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
                        <span className="block truncate text-[16px] font-bold text-[#1f2937] sm:text-[18px]">
                          {person.organizationName?.trim() || `${person.firstname} ${person.lastname}`}
                        </span>
                        <span className="mt-1 block truncate text-[12px] text-[#5f6b7a]">
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

          <section aria-label="Organizer details" className="min-w-0 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5">
            {selectedOrganizer ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4fc3b1] text-[18px] font-bold text-white">
                      {getInitials(selectedOrganizer.organizationName || `${selectedOrganizer.firstname} ${selectedOrganizer.lastname}`)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[18px] font-bold text-[#1f2937] sm:text-[20px]">
                        {selectedOrganizer.organizationName?.trim() || `${selectedOrganizer.firstname} ${selectedOrganizer.lastname}`}
                      </h2>
                      <p className="mt-1 truncate text-sm text-[#5f6b7a]">
                        {selectedOrganizer.firstname} {selectedOrganizer.lastname} · {selectedOrganizer.email}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-2"><StatusBadge status={selectedOrganizer.profileApprovalStatus} />{!selectedOrganizer.isActive && <span className="rounded-full border border-stone-200 bg-surface-sunken px-2 py-0.5 text-xs text-stone-700">Inactive</span>}</span>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <OrganizerInfo label="Registration number" value={selectedOrganizer.organizationRegistrationNumber} />
                  <OrganizerInfo label="Organization email" value={selectedOrganizer.organizationEmail} />
                  <OrganizerInfo label="Phone" value={selectedOrganizer.phone} />
                </div>

                <div className="mb-5 rounded-[16px] border border-[#e5e7eb] bg-[#f9f9f9] p-4">
                  <h3 className="mb-3 text-[16px] font-bold text-[#1f2937]">Documents</h3>
                  <div className="flex min-h-[150px] items-center justify-center rounded-[12px] border border-dashed border-[#dfe3ea] bg-white px-4 text-center text-sm text-[#6b7280]">
                    Organization documents are not available from the organizer management data.
                  </div>
                </div>

                <div className="mb-6 rounded-[16px] border border-[#e5e7eb] bg-[#f9f9f9] p-4">
                  <h3 className="mb-2 text-[16px] font-bold text-[#1f2937]">Associated events</h3>
                  <p className="text-sm text-[#6b7280]">Event associations are not included in the organizer management data.</p>
                </div>

                <div className="mb-6">
                  <h3 className="mb-2 text-[16px] font-bold text-[#1f2937]">About</h3>
                  <p className="text-[14px] leading-6 text-[#4b5563]">
                    {selectedOrganizer.organizationDescription?.trim() || 'No organization description provided.'}
                  </p>
                </div>

                {selectedTab === 'Pending' && selectedOrganizer.profileApprovalStatus === 'PENDING_APPROVAL' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-10 whitespace-nowrap rounded-lg bg-black px-4 text-sm font-bold leading-5 text-white shadow-sm hover:bg-neutral-500 focus-visible:ring-black"
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
                      className="min-h-10 whitespace-nowrap rounded-lg border border-[#d9e0ea] px-4 text-sm font-bold leading-5 text-[#26354b] shadow-none hover:bg-neutral-50"
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
            ) : error && organizers.length === 0 ? (
              <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-[#6b7280]">Organizer details are unavailable until the list loads.</div>
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

function CsvIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
