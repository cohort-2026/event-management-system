import { useCallback, useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import PageWrapper from '@/layouts/PageWrapper';
import OrganizerSidebar from '@/layouts/OrganizerSidebar';
import OrganizerTopBar from '@/layouts/OrganizerTopBar';
import Badge, { type BadgeVariant } from '@/components/legacy/Badge';
import Button from '@/components/legacy/Button';
import { approveApplication, getEventApplications, markVendorInvoicePaid, rejectApplication } from '@/features/vendor/services/vendorService';
import { downloadInvoicePdf } from '@/features/vendor/services/vendorInvoicePdf';
import { getMyEvents } from '@/features/events/services/eventService';
import type { VendorApplication } from '@/types/vendor';

const statusVariant: Record<VendorApplication['status'], BadgeVariant> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
};

const responseMessage = (error: unknown, fallback: string): string => (
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message ?? fallback : fallback
);

const formatRelativeTime = (value: string): string => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 60) return `${minutes || 1}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const safeDocumentUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const downloadApplicationsCsv = (applications: VendorApplication[]) => {
  const columns = [
    'Vendor', 'Business', 'Email', 'Stand type', 'Stand size', 'Status', 'Quoted amount', 'Assigned stand',
  ];
  const escapeCell = (value: unknown) => {
    const text = String(value ?? '');
    const safeText = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const rows = applications.map(application => [
    `${application.vendor?.firstname ?? ''} ${application.vendor?.lastname ?? ''}`.trim(),
    application.vendor?.vendorProfile?.businessName || application.companyName,
    application.vendor?.email,
    application.requestedStandType,
    application.requestedStandSize,
    application.status.replaceAll('_', ' '),
    application.quotedAmount,
    application.assignedStand,
  ]);
  const csv = [columns, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vendors.csv';
  link.click();
  URL.revokeObjectURL(url);
};

export default function VendorApplications() {
  const { id: eventId } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [assignedStands, setAssignedStands] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeStatus, setActiveStatus] = useState<'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'INACTIVE'>('APPROVED');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const vendorDirectory = applications;
  const statusTabs = [
    { id: 'PENDING_REVIEW' as const, label: 'Pending', count: vendorDirectory.filter(application => application.status === 'PENDING_REVIEW' && application.vendor?.isActive !== false).length },
    { id: 'APPROVED' as const, label: 'Approved', count: vendorDirectory.filter(application => application.status === 'APPROVED' && application.vendor?.isActive !== false).length },
    { id: 'REJECTED' as const, label: 'Rejected', count: vendorDirectory.filter(application => application.status === 'REJECTED' && application.vendor?.isActive !== false).length },
    { id: 'INACTIVE' as const, label: 'Inactive', count: vendorDirectory.filter(application => application.vendor?.isActive === false).length },
  ];
  const visibleApplications = activeStatus === 'INACTIVE'
    ? vendorDirectory.filter(application => application.vendor?.isActive === false)
    : vendorDirectory.filter(application => application.status === activeStatus && application.vendor?.isActive !== false);
  const selectedApplication = visibleApplications.find(application => application.id === selectedApplicationId) ?? visibleApplications[0];

  const refresh = useCallback(async () => {
    setError('');
    try {
      if (eventId) {
        const response = await getEventApplications(eventId);
        setApplications(response.data.data);
      } else {
        const eventsResponse = await getMyEvents();
        const organizerEvents = eventsResponse.data.data;
        const eventResults = await Promise.allSettled(organizerEvents.map(event => getEventApplications(event.id)));
        const loadedApplications: VendorApplication[] = [];
        let failedEvents = 0;
        eventResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const event = organizerEvents[index];
            loadedApplications.push(...result.value.data.data.map(application => ({
              ...application,
              event: { id: event.id, title: event.title, date: event.date, venue: event.venue },
            })));
          }
          else failedEvents += 1;
        });
        setApplications(loadedApplications);
        if (failedEvents > 0) setError(`Vendor applications could not be loaded for ${failedEvents} ${failedEvents === 1 ? 'event' : 'events'}.`);
      }
    } catch (loadError) {
      setError(responseMessage(loadError, 'Stand requests could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markPaid = async (application: VendorApplication) => {
    if (!application.invoice || !window.confirm(`Confirm that invoice ${application.invoice.invoiceNumber} has been paid?`)) return;
    setError('');
    setNotice('');
    setPayingId(application.id);
    try {
      await markVendorInvoicePaid(application.id);
      setNotice('Invoice marked paid. The vendor can now access staff passes.');
      await refresh();
    } catch (paymentError) {
      setError(responseMessage(paymentError, 'Invoice could not be marked paid.'));
    } finally {
      setPayingId(null);
    }
  };

  const approve = async (event: FormEvent<HTMLFormElement>, applicationId: string) => {
    event.preventDefault();
    const assignedStand = assignedStands[applicationId]?.trim() ?? '';
    setError('');
    setNotice('');
    setApprovingId(applicationId);
    try {
      const response = await approveApplication(applicationId, assignedStand);
      setNotice(response.data.invoiceEmailSent === false
        ? 'Stand approved and invoice issued. Email delivery failed; the vendor can view it in My Applications.'
        : 'Stand approved, assigned, and invoiced.');
      setActiveStatus('APPROVED');
      setSelectedApplicationId(applicationId);
      await refresh();
    } catch (decisionError) {
      setError(responseMessage(decisionError, 'Stand request could not be approved.'));
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async (event: FormEvent<HTMLFormElement>, applicationId: string) => {
    event.preventDefault();
    const reason = rejectionReasons[applicationId]?.trim() ?? '';
    setError('');
    setNotice('');
    setRejectingId(applicationId);
    try {
      await rejectApplication(applicationId, reason);
      setNotice('Stand request rejected. The vendor has been notified.');
      await refresh();
    } catch (decisionError) {
      setError(responseMessage(decisionError, 'Stand request could not be rejected.'));
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 bg-white shadow-sm sm:-mx-6 sm:-mt-6">
            <OrganizerTopBar title="Vendors" showTitle={false} headingEyebrow="Organizer" heading="Vendor" headingDetail="In application for a stand." />
          </div>
          <h1 className="sr-only">Vendors</h1>
          <div className="mb-2 flex justify-end">
            <Button type="button" variant="secondary" disabled={applications.length === 0} onClick={() => downloadApplicationsCsv(applications)}>
              Export
            </Button>
          </div>
          <div role="tablist" aria-label="Vendor application status" className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-[#f3f4f5] p-1.5">
            {statusTabs.map(tab => {
              const selected = activeStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveStatus(tab.id)}
                  className={`organizer-status-tab inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[#ffe4e6] px-3 text-xs font-normal text-neutral-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020] ${selected ? 'ring-2 ring-inset ring-[#800020]' : ''}`}
                >
                  {tab.label}
                  {tab.id !== 'INACTIVE' && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-normal text-neutral-900">{tab.count}</span>}
                </button>
              );
            })}
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
          {loading ? (
            <p role="status" className="py-10 text-center text-neutral-500">Loading stand requests…</p>
          ) : visibleApplications.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">No stand requests yet</h2>
              <p className="mt-2 text-sm text-neutral-600">Requests for this event will appear here.</p>
            </div>
          ) : (
            <div className="grid min-h-[560px] grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,1.2fr)_minmax(0,1.7fr)]">
              <section aria-label="Vendors in selected status" className="rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="space-y-2">
                  {visibleApplications.map(application => {
                    const vendorName = application.vendor?.vendorProfile?.businessName || application.companyName;
                    const initials = vendorName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'V';
                    const selected = selectedApplication?.id === application.id;
                    return (
                      <button key={application.id} type="button" onClick={() => setSelectedApplicationId(application.id)} aria-pressed={selected} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? 'border-slate-200 bg-slate-100' : 'border-transparent bg-white hover:bg-slate-50'}`}>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dd2349] text-sm font-normal text-white">{initials}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-normal text-slate-900">{vendorName}</span>
                          <span className="mt-1 block truncate text-sm text-slate-500">{application.event?.title || application.vendor?.vendorProfile?.productsServices?.[0] || 'Vendor'} · {application.vendor?.vendorProfile?.supportingDocumentUrls?.length ?? 0} documents</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{formatRelativeTime(application.createdAt)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              {selectedApplication && (() => {
                const application = selectedApplication;
                const profile = application.vendor?.vendorProfile;
                const eventTitle = application.event?.title;
                const documentLinks = (profile?.supportingDocumentUrls ?? [])
                  .map(url => ({ url, safeUrl: safeDocumentUrl(url) }))
                  .filter((document): document is { url: string; safeUrl: string } => document.safeUrl !== null);
                const vendorName = profile?.businessName || application.companyName;
                const initials = vendorName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'V';
                return (
                  <article key={application.id} className="w-full min-w-0 max-w-2xl self-start rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dd2349] text-sm font-normal text-white">{initials}</span>
                        <div className="min-w-0">
                          <h2 className="break-words text-sm font-normal text-slate-900">{vendorName}</h2>
                          <p className="mt-1 text-sm text-slate-600">{application.vendor?.firstname} {application.vendor?.lastname}{application.vendor?.email && <> · <a className="text-brand-700 underline" href={`mailto:${application.vendor.email}`}>{application.vendor.email}</a></>}</p>
                        </div>
                      </div>
                      <Badge variant={application.vendor?.isActive === false ? 'danger' : statusVariant[application.status]}>{application.vendor?.isActive === false ? 'Inactive' : application.status.replace('_', ' ')}</Badge>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-[10px] border border-slate-200 bg-[#f7f7f7] p-2"><p className="text-xs uppercase tracking-wider text-slate-500">CIPC number</p><p className="mt-1 break-words text-sm font-normal text-slate-900">{profile?.businessRegistrationNumber || application.registrationNumber || 'Not provided'}</p></div>
                      <div className="rounded-[10px] border border-slate-200 bg-[#f7f7f7] p-2"><p className="text-xs uppercase tracking-wider text-slate-500">Contact</p><p className="mt-1 break-words text-sm font-normal text-slate-900">{profile?.contactEmail || application.vendor?.email || 'Not provided'}</p></div>
                      <div className="rounded-[10px] border border-slate-200 bg-[#f7f7f7] p-2"><p className="text-xs uppercase tracking-wider text-slate-500">Category</p><p className="mt-1 break-words text-sm font-normal text-slate-900">{profile?.productsServices?.[0] || 'Not provided'}</p></div>
                    </div>

                    <section className="mb-3 rounded-[12px] border border-slate-200 bg-[#f9f9f9] p-3">
                      <h3 className="mb-2 text-sm font-normal text-slate-900">Documents</h3>
                      {documentLinks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {documentLinks.map((document, index) => {
                            let filename = `Supporting document ${index + 1}`;
                            try { filename = decodeURIComponent(new URL(document.safeUrl).pathname.split('/').pop() || filename); } catch { /* Keep the fallback label for unusual URLs. */ }
                            return <a key={`${document.safeUrl}-${index}`} href={document.safeUrl} target="_blank" rel="noreferrer" className="group rounded-[10px] border border-slate-200 bg-slate-100 p-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-200"><span className="mb-2 flex h-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-200 text-2xl text-slate-400" aria-hidden="true">▤</span><span className="block break-all">{filename}</span></a>;
                          })}
                        </div>
                      ) : <p className="text-sm text-slate-500">No supporting documents provided.</p>}
                    </section>

                    <section className="mb-3">
                      <h3 className="mb-1 text-sm font-normal text-slate-900">About</h3>
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{profile?.businessDescription || application.description || 'No business description provided.'}</p>
                    </section>

                    <div className="mb-3 rounded-xl border border-slate-200 p-3">
                      {eventTitle && <p className="mb-2 text-sm font-normal text-slate-900">Application for {eventTitle}</p>}
                      <section>
                        <h3 className="text-sm font-normal text-neutral-900">Requested stand</h3>
                        <dl className="mt-2 space-y-2 text-sm">
                          <div><dt className="inline font-medium text-neutral-600">Type and size: </dt><dd className="inline text-neutral-800">{application.requestedStandType} · {application.requestedStandSize}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Setup and requirements</dt><dd className="mt-1 whitespace-pre-line text-neutral-800">{application.standDescription}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Additional information</dt><dd className="mt-1 whitespace-pre-line text-neutral-800">{application.supportingInformation || 'None provided'}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Area and estimated charge</dt><dd className="mt-1 text-neutral-800">{Number(application.standAreaSqm).toFixed(2)} m² × ZAR {Number(application.standRatePerSqm).toFixed(2)} = ZAR {Number(application.quotedAmount).toFixed(2)}</dd></div>
                          <div>
                            <dt className="font-medium text-neutral-600">Staff ({application.staffMembers?.length ?? 0})</dt>
                            <dd className="mt-1 text-neutral-800">{application.staffMembers?.length ? application.staffMembers.map(member => `${member.name} (${member.email})`).join(', ') : 'None listed'}</dd>
                          </div>
                        </dl>
                      </section>
                    </div>

                    {application.status === 'PENDING_REVIEW' && application.vendor?.isActive !== false ? (
                      <div className="mt-5 grid gap-5 border-t border-neutral-100 pt-5 md:grid-cols-2">
                        <form className="space-y-3" onSubmit={event => void approve(event, application.id)}>
                          <label className="block text-sm font-medium text-neutral-700">
                            Assign stand identifier
                            <input required maxLength={80} value={assignedStands[application.id] ?? ''} onChange={event => setAssignedStands(current => ({ ...current, [application.id]: event.target.value }))} placeholder="e.g. A-12" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                          </label>
                          <Button type="submit" size="sm" className="min-h-20 w-full max-w-40 rounded-xl bg-black px-6 text-base font-bold leading-6 text-white shadow-sm hover:bg-neutral-900" loading={approvingId === application.id} disabled={Boolean(approvingId || rejectingId)}>Approve vendor</Button>
                        </form>
                        <form className="space-y-3" onSubmit={event => void reject(event, application.id)}>
                          <label className="block text-sm font-medium text-neutral-700">
                            Rejection reason (required)
                            <textarea required minLength={5} maxLength={1000} rows={2} value={rejectionReasons[application.id] ?? ''} onChange={event => setRejectionReasons(current => ({ ...current, [application.id]: event.target.value }))} placeholder="Explain what the vendor should change." className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                          </label>
                          <Button type="submit" variant="secondary" size="sm" className="min-h-20 w-full max-w-48 rounded-xl border border-[#d9e0ea] px-6 text-base font-bold leading-6 text-[#26354b] shadow-none hover:bg-neutral-50" loading={rejectingId === application.id} disabled={Boolean(approvingId || rejectingId)}>Reject with reason...</Button>
                        </form>
                      </div>
                    ) : (
                      <div className="mt-5 border-t border-neutral-100 pt-4 text-sm">
                        <p className="text-neutral-600">
                          Decision by {application.decidedBy ? `${application.decidedBy.firstname} ${application.decidedBy.lastname}` : 'organizer'}
                          {application.decidedAt && ` on ${new Date(application.decidedAt).toLocaleString()}`}
                        </p>
                        {application.assignedStand && <p className="mt-1 font-medium text-emerald-800">Assigned stand: {application.assignedStand}</p>}
                        {application.rejectionReason && <p className="mt-1 whitespace-pre-line text-rose-700">Reason: {application.rejectionReason}</p>}
                        {application.status === 'APPROVED' && application.invoice && (
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <p className="font-medium text-neutral-700">Invoice {application.invoice.invoiceNumber}: {application.invoice.status === 'ISSUED' ? 'Unpaid' : application.invoice.status === 'PAID' ? 'Paid' : 'Void'}</p>
                            <Button type="button" size="sm" variant="secondary" onClick={() => downloadInvoicePdf(application)}>
                              Download invoice
                            </Button>
                            {application.invoice.status === 'ISSUED' && (
                              <Button type="button" size="sm" loading={payingId === application.id} disabled={Boolean(payingId)} onClick={() => void markPaid(application)}>
                                Mark invoice paid
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })()}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
