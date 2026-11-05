import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { approveApplication, getEventApplications, rejectApplication } from '@/services/vendorService';
import type { VendorApplication } from '@/types/vendor';

const statusVariant: Record<VendorApplication['status'], BadgeVariant> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
};

const responseMessage = (error: unknown, fallback: string): string => (
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message ?? fallback : fallback
);

const safeDocumentUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export default function VendorApplications() {
  const { id: eventId } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [assignedStands, setAssignedStands] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    if (!eventId) {
      setError('A valid event is required.');
      setLoading(false);
      return;
    }
    try {
      const response = await getEventApplications(eventId);
      setApplications(response.data.data);
    } catch (loadError) {
      setError(responseMessage(loadError, 'Stand requests could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [eventId]);

  const approve = async (event: FormEvent<HTMLFormElement>, applicationId: string) => {
    event.preventDefault();
    const assignedStand = assignedStands[applicationId]?.trim() ?? '';
    setError('');
    setNotice('');
    setApprovingId(applicationId);
    try {
      await approveApplication(applicationId, assignedStand);
      setNotice('Stand request approved and the stand assigned.');
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
    <PageWrapper>
      <div className="flex flex-col gap-8 lg:flex-row">
        <DashboardSidebar
          title="Organizer"
          subtitle="Operations"
          items={[
            { label: 'Overview', to: '/organizer', icon: <span aria-hidden="true">⌂</span> },
            { label: 'My events', to: '/organizer/events', icon: <span aria-hidden="true">▦</span> },
            { label: 'Create event', to: '/organizer/events/new', icon: <span aria-hidden="true">＋</span> },
            { label: 'My profile', to: '/organizer/profile', icon: <span aria-hidden="true">◎</span> },
          ]}
        />
        <section className="min-w-0 flex-1">
          <DashboardHeader
            title="Stand requests"
            subtitle="Review vendor profiles, requested setups, and supporting information."
            breadcrumbs={[{ label: 'My events', to: '/organizer/events' }, { label: 'Stand requests' }]}
          />
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
          {loading ? (
            <p role="status" className="py-10 text-center text-neutral-500">Loading stand requests…</p>
          ) : applications.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">No stand requests yet</h2>
              <p className="mt-2 text-sm text-neutral-600">Requests for this event will appear here.</p>
              <Link to="/organizer/events" className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline">Back to events</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {applications.map(application => {
                const profile = application.vendor?.vendorProfile;
                const documentLinks = (profile?.supportingDocumentUrls ?? [])
                  .map(url => ({ url, safeUrl: safeDocumentUrl(url) }))
                  .filter((document): document is { url: string; safeUrl: string } => document.safeUrl !== null);
                return (
                  <article key={application.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-neutral-900">{profile?.businessName || application.companyName}</h2>
                        <p className="mt-1 text-sm text-neutral-600">
                          {application.vendor?.firstname} {application.vendor?.lastname}
                          {application.vendor?.email && <> · <a className="text-brand-700 underline" href={`mailto:${application.vendor.email}`}>{application.vendor.email}</a></>}
                        </p>
                      </div>
                      <Badge variant={statusVariant[application.status]}>{application.status.replace('_', ' ')}</Badge>
                    </div>

                    <div className="mt-5 grid gap-5 border-t border-neutral-100 pt-5 md:grid-cols-2">
                      <section>
                        <h3 className="text-sm font-bold text-neutral-900">Vendor profile</h3>
                        <dl className="mt-2 space-y-2 text-sm">
                          <div><dt className="inline font-medium text-neutral-600">Registration: </dt><dd className="inline text-neutral-800">{profile?.businessRegistrationNumber || application.registrationNumber || 'Not provided'}</dd></div>
                          <div><dt className="inline font-medium text-neutral-600">Contact: </dt><dd className="inline text-neutral-800">{profile?.contactPerson || 'Not provided'}</dd></div>
                          <div><dt className="inline font-medium text-neutral-600">Email / phone: </dt><dd className="inline text-neutral-800">{profile?.contactEmail || 'Not provided'} / {profile?.contactPhone || 'Not provided'}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Products and services</dt><dd className="mt-1 text-neutral-800">{profile?.productsServices?.join(', ') || application.description || 'Not provided'}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Business profile</dt><dd className="mt-1 whitespace-pre-line text-neutral-800">{profile?.businessDescription || application.description || 'Not provided'}</dd></div>
                          {documentLinks.length > 0 && (
                            <div>
                              <dt className="font-medium text-neutral-600">Supporting documents</dt>
                              <dd className="mt-1 flex flex-col gap-1">
                                {documentLinks.map((document, index) => <a key={`${document.safeUrl}-${index}`} href={document.safeUrl} target="_blank" rel="noreferrer" className="break-all text-brand-700 underline">Supporting document {index + 1}</a>)}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </section>
                      <section>
                        <h3 className="text-sm font-bold text-neutral-900">Requested stand</h3>
                        <dl className="mt-2 space-y-2 text-sm">
                          <div><dt className="inline font-medium text-neutral-600">Type and size: </dt><dd className="inline text-neutral-800">{application.requestedStandType} · {application.requestedStandSize}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Setup and requirements</dt><dd className="mt-1 whitespace-pre-line text-neutral-800">{application.standDescription}</dd></div>
                          <div><dt className="font-medium text-neutral-600">Additional information</dt><dd className="mt-1 whitespace-pre-line text-neutral-800">{application.supportingInformation || 'None provided'}</dd></div>
                        </dl>
                      </section>
                    </div>

                    {application.status === 'PENDING_REVIEW' ? (
                      <div className="mt-5 grid gap-5 border-t border-neutral-100 pt-5 md:grid-cols-2">
                        <form className="space-y-3" onSubmit={event => void approve(event, application.id)}>
                          <label className="block text-sm font-medium text-neutral-700">
                            Assign stand identifier
                            <input required maxLength={80} value={assignedStands[application.id] ?? ''} onChange={event => setAssignedStands(current => ({ ...current, [application.id]: event.target.value }))} placeholder="e.g. A-12" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                          </label>
                          <Button type="submit" size="sm" loading={approvingId === application.id} disabled={Boolean(approvingId || rejectingId)}>Approve and assign</Button>
                        </form>
                        <form className="space-y-3" onSubmit={event => void reject(event, application.id)}>
                          <label className="block text-sm font-medium text-neutral-700">
                            Rejection reason (required)
                            <textarea required minLength={5} maxLength={1000} rows={2} value={rejectionReasons[application.id] ?? ''} onChange={event => setRejectionReasons(current => ({ ...current, [application.id]: event.target.value }))} placeholder="Explain what the vendor should change." className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                          </label>
                          <Button type="submit" variant="danger" size="sm" loading={rejectingId === application.id} disabled={Boolean(approvingId || rejectingId)}>Reject request</Button>
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
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
