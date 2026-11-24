import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Button from '@/components/legacy/Button';
import Input from '@/components/legacy/Input';
import Modal from '@/components/legacy/Modal';
import Spinner from '@/components/legacy/Spinner';
import NotificationBell from '@/layouts/NotificationBell';
import {
  downloadVendorReviewDocument,
  getPendingVendorProfiles,
  getVendorProfilesByStatus,
  reviewVendorProfile,
} from '@/features/vendor/services/vendorService';
import type { PendingVendorProfile, VendorDocument } from '@/types/vendor';
import { StatusBadge } from '@/components/shared';

type QueueTab = 'Pending' | 'Approved' | 'Rejected' | 'Inactive';

const tabs: QueueTab[] = ['Pending', 'Approved', 'Rejected', 'Inactive'];

const responseMessage = (error: unknown, fallback: string): string => (
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message ?? fallback : fallback
);

const vendorName = (profile: PendingVendorProfile) => profile.businessName.trim() || `${profile.user.firstname} ${profile.user.lastname}`;

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'V';

const formatAge = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes || 1}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const downloadVendorProfilesCsv = (profiles: PendingVendorProfile[]) => {
  const columns = ['Vendor', 'Contact person', 'Email', 'Registration number', 'Contact email', 'Phone', 'Category', 'Status', 'Documents', 'Created'];
  const escapeCell = (value: unknown) => {
    const text = String(value ?? '');
    const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const rows = profiles.map(profile => [
    profile.businessName,
    profile.contactPerson,
    profile.user.email,
    profile.businessRegistrationNumber,
    profile.contactEmail,
    profile.contactPhone,
    profile.productsServices.join('; '),
    profile.status,
    profile.user.vendorDocuments.length,
    profile.createdAt,
  ]);
  const csv = [columns, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = 'vendors.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function VendorProfileApprovalQueue({ status = 'PENDING_REVIEW' }: { status?: 'PENDING_REVIEW' | 'APPROVED' }) {
  const [profiles, setProfiles] = useState<PendingVendorProfile[]>([]);
  const [selectedTab, setSelectedTab] = useState<QueueTab>(status === 'APPROVED' ? 'Approved' : 'Pending');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<PendingVendorProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getPendingVendorProfiles(),
      getVendorProfilesByStatus('APPROVED'),
      getVendorProfilesByStatus('REJECTED'),
    ])
      .then(([pendingResponse, approvedResponse, rejectedResponse]) => {
        if (active) setProfiles([...pendingResponse.data.data, ...approvedResponse.data.data, ...rejectedResponse.data.data]);
      })
      .catch(loadError => {
        if (active) setError(responseMessage(loadError, 'Vendor profiles could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const tabCounts: Record<QueueTab, number> = {
    Pending: profiles.filter(profile => profile.status === 'PENDING_REVIEW' && profile.user.isActive).length,
    Approved: profiles.filter(profile => profile.status === 'APPROVED' && profile.user.isActive).length,
    Rejected: profiles.filter(profile => profile.status === 'REJECTED').length,
    Inactive: profiles.filter(profile => profile.status === 'APPROVED' && !profile.user.isActive).length,
  };

  const visibleProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles.filter(profile => {
      if (selectedTab === 'Pending' && !(profile.status === 'PENDING_REVIEW' && profile.user.isActive)) return false;
      if (selectedTab === 'Approved' && !(profile.status === 'APPROVED' && profile.user.isActive)) return false;
      if (selectedTab === 'Rejected' && profile.status !== 'REJECTED') return false;
      if (selectedTab === 'Inactive' && !(profile.status === 'APPROVED' && !profile.user.isActive)) return false;
      return !query || `${profile.businessName} ${profile.user.firstname} ${profile.user.lastname} ${profile.user.email} ${profile.contactEmail}`.toLowerCase().includes(query);
    });
  }, [profiles, search, selectedTab]);

  const selectedProfile = visibleProfiles.find(profile => profile.id === selectedProfileId) ?? visibleProfiles[0] ?? null;

  const approveProfile = async (profile: PendingVendorProfile) => {
    setError('');
    setNotice('');
    setApprovingId(profile.id);
    try {
      const response = await reviewVendorProfile(profile.id, 'approve');
      setProfiles(current => current.map(item => item.id === profile.id ? { ...item, status: 'APPROVED', rejectionReason: null } : item));
      setNotice(response.data.message ?? 'Vendor profile approved. The vendor can now apply for stands.');
    } catch (decisionError) {
      setError(responseMessage(decisionError, 'Vendor profile could not be approved.'));
    } finally {
      setApprovingId(null);
    }
  };

  const rejectProfile = async () => {
    if (!rejectionTarget) return;
    setError('');
    setNotice('');
    setRejectingId(rejectionTarget.id);
    try {
      const response = await reviewVendorProfile(rejectionTarget.id, 'reject', rejectionReason.trim());
      setProfiles(current => current.map(item => item.id === rejectionTarget.id
        ? { ...item, status: 'REJECTED', rejectionReason: rejectionReason.trim() }
        : item));
      setNotice(response.data.message ?? 'Vendor profile rejected.');
      setRejectionTarget(null);
      setRejectionReason('');
    } catch (decisionError) {
      setError(responseMessage(decisionError, 'Vendor profile could not be rejected.'));
    } finally {
      setRejectingId(null);
    }
  };

  const downloadDocument = async (document: VendorDocument) => {
    setError('');
    setDownloadingDocumentId(document.id);
    try {
      const response = await downloadVendorReviewDocument(document.id);
      const url = URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(responseMessage(downloadError, 'The document could not be downloaded.'));
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  return (
    <div className="min-w-0 rounded-[18px] border border-[#dfe3ea] bg-[#f7f7f6] p-3 text-[#1f2937] antialiased sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-[#5a6470]">Vendors</div>
        <div className="ml-auto flex w-full min-w-0 items-center justify-end gap-3 sm:w-auto">
          <div className="min-w-0 flex-1 sm:w-[240px] sm:flex-none">
            <Input aria-label="Search vendors" placeholder="Search vendors..." value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <button type="button" onClick={() => downloadVendorProfilesCsv(visibleProfiles)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#dfe3ea] bg-white px-2.5 text-xs font-semibold text-[#374151] shadow-sm hover:bg-[#f8f8f7]" aria-label="Download vendors as CSV">
            <CsvIcon />CSV
          </button>
          <NotificationBell />
        </div>
      </div>

      <h1 className="mb-5 text-[28px] font-extrabold tracking-[-0.06em] text-[#1f2937] sm:text-[34px]">Vendors</h1>

      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="mb-5 flex gap-3 overflow-x-auto rounded-[12px] border border-[#e5e7eb] bg-[#f2f3f2] p-1" role="tablist" aria-label="Vendor profile status">
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selectedTab === tab}
            onClick={() => { setSelectedTab(tab); setSelectedProfileId(null); setSearch(''); setError(''); setNotice(''); }}
            className={`flex shrink-0 items-center gap-2 rounded-[9px] px-3 py-2 text-[14px] font-medium transition-colors ${selectedTab === tab ? 'bg-[#e6e7e8] text-[#1f2937] shadow-sm' : 'text-[#65707d] hover:bg-white/70 hover:text-[#1f2937]'}`}
          >
            {tab}
            {tab !== 'Inactive' && <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#374151]">{tabCounts[tab]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div role="status" className="flex min-h-64 items-center justify-center"><Spinner /></div>
      ) : (
        <div className="grid min-h-0 grid-cols-1 gap-5 lg:min-h-[560px] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.7fr)]">
          <section aria-label={`${selectedTab} vendor profiles`} className="min-w-0 rounded-[14px] border border-[#e5e7eb] bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            {visibleProfiles.length === 0 ? (
              <p className="px-3 py-8 text-sm text-neutral-500">{selectedTab === 'Rejected' ? 'No rejected vendor profiles are available in this queue.' : `No ${selectedTab.toLowerCase()} vendor profiles found.`}</p>
            ) : (
              <div className="space-y-2">
                {visibleProfiles.map(profile => {
                  const name = vendorName(profile);
                  const selected = selectedProfile?.id === profile.id;
                  return (
                    <button key={profile.id} type="button" aria-pressed={selected} onClick={() => setSelectedProfileId(profile.id)} className={`flex w-full items-center justify-between gap-3 rounded-[12px] border p-3 text-left transition-colors ${selected ? 'border-[#e1e5e9] bg-[#f4f6f8]' : 'border-transparent bg-white hover:border-[#e1e5e9] hover:bg-[#f8f9fa]'}`}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5ad1c3] text-[16px] font-bold text-white">{initials(name)}</span>
                        <span className="min-w-0">
                          <span className="block break-words text-[16px] font-bold text-[#1f2937] sm:text-[18px]">{name}</span>
                          <span className="mt-1 block truncate text-[12px] text-[#5f6b7a]">{profile.productsServices[0] || 'Vendor'} · {profile.user.vendorDocuments.length} documents</span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#f0f1f4] px-2.5 py-1 text-[12px] font-medium text-[#4b5563]">{formatAge(profile.createdAt)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-label="Vendor profile details" className="min-w-0 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-5">
            {selectedProfile ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4fc3b1] text-[16px] font-bold text-white">{initials(vendorName(selectedProfile))}</span>
                    <div className="min-w-0">
                      <h2 className="break-words text-[18px] font-bold text-[#1f2937] sm:text-[20px]">{vendorName(selectedProfile)}</h2>
                      <p className="mt-1 break-all text-sm text-[#5f6b7a]">{selectedProfile.user.firstname} {selectedProfile.user.lastname} · {selectedProfile.user.email}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-2"><StatusBadge status={selectedProfile.status} />{!selectedProfile.user.isActive && <span className="rounded-full border border-stone-200 bg-surface-sunken px-2 py-0.5 text-xs text-stone-700">Inactive</span>}</span>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <InfoCard label="CIPC number" value={selectedProfile.businessRegistrationNumber} />
                  <InfoCard label="Contact" value={selectedProfile.contactEmail || selectedProfile.user.email} />
                  <InfoCard label="Category" value={selectedProfile.productsServices[0] || 'Not provided'} />
                </div>

                <section className="mb-5 rounded-[12px] border border-[#e5e7eb] bg-[#f9f9f9] p-4">
                  <h3 className="mb-3 text-[16px] font-bold text-[#1f2937]">Documents</h3>
                  {selectedProfile.user.vendorDocuments.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedProfile.user.vendorDocuments.map(document => (
                        <button key={document.id} type="button" disabled={Boolean(downloadingDocumentId)} onClick={() => void downloadDocument(document)} className="rounded-[10px] border border-[#dfe3ea] bg-[#f1f1f1] p-2 text-center text-[12px] font-medium text-[#4b5563] hover:bg-[#e9ebee] disabled:opacity-60">
                          <span className="mb-2 flex h-24 items-center justify-center rounded-lg border border-[#dfe3ea] bg-[#e5e7eb] text-lg text-[#687280]" aria-hidden="true">{downloadingDocumentId === document.id ? '…' : '↓'}</span>
                          <span className="block break-all">{document.originalName}</span>
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-sm text-[#6b7280]">No supporting documents provided.</p>}
                </section>

                <section className="mb-5">
                  <h3 className="mb-2 text-[16px] font-bold text-[#1f2937]">About</h3>
                  <p className="whitespace-pre-line text-[14px] leading-6 text-[#4b5563]">{selectedProfile.businessDescription || 'No business description provided.'}</p>
                </section>

                {selectedProfile.status === 'PENDING_REVIEW' && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-[#eef0f3] pt-5">
                    <Button type="button" size="md" variant="ghost" loading={approvingId === selectedProfile.id} disabled={Boolean(approvingId || rejectingId)} onClick={() => void approveProfile(selectedProfile)} className="rounded-lg bg-black font-bold text-white shadow-sm hover:bg-neutral-800 hover:text-white focus-visible:ring-black">
                      Approve vendor
                    </Button>
                    <Button type="button" size="md" variant="secondary" disabled={Boolean(approvingId || rejectingId)} onClick={() => { setRejectionTarget(selectedProfile); setRejectionReason(''); setError(''); }} className="rounded-lg border border-[#dfe3ea] bg-white font-bold text-[#374151] hover:bg-[#f3f4f6]">
                      Reject with reason...
                    </Button>
                  </div>
                )}
                {selectedProfile.status === 'REJECTED' && selectedProfile.rejectionReason && <p className="mt-4 whitespace-pre-line text-sm text-rose-700">Reason: {selectedProfile.rejectionReason}</p>}
              </>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center text-center text-sm text-[#6b7280]">
                Select a vendor to view their profile.
              </div>
            )}
          </section>
        </div>
      )}

      <Modal open={Boolean(rejectionTarget)} onClose={() => { if (!rejectingId) setRejectionTarget(null); }} title="Reject vendor profile" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">Explain what the vendor needs to correct. This feedback will be shown on their profile.</p>
          <textarea rows={5} minLength={10} maxLength={2000} required value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="Describe what needs to change (at least 10 characters)." className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <p className="text-xs text-neutral-500">{rejectionReason.trim().length}/2000 characters</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={Boolean(rejectingId)} onClick={() => setRejectionTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" loading={Boolean(rejectingId)} disabled={rejectionReason.trim().length < 10} onClick={() => void rejectProfile()}>Confirm rejection</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[#e5e7eb] bg-[#f7f7f7] p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">{label}</p>
      <p className="mt-2 break-words text-[14px] font-semibold text-[#1f2937]">{value || 'Not provided'}</p>
    </div>
  );
}

function CsvIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
