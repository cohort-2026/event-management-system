import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import OrganizerPageLayout from '@/components/organizer/OrganizerPageLayout';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getMyEvents } from '@/services/eventService';
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

async function loadApplications(eventId?: string): Promise<VendorApplication[]> {
  if (eventId) {
    const response = await getEventApplications(eventId);
    return response.data.data;
  }

  const eventsResponse = await getMyEvents();
  const applicationGroups = await Promise.all(eventsResponse.data.data.map(async event => {
    const response = await getEventApplications(event.id);
    return response.data.data.map(application => ({
      ...application,
      event: { id: event.id, title: event.title, date: event.startTime, venue: event.venue },
    }));
  }));
  return applicationGroups.flat();
}

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorApplication['status'] | 'ALL'>('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');

  const refresh = useCallback(async () => {
    try {
      setApplications(await loadApplications(eventId));
      setError('');
    } catch (loadError) {
      setError(responseMessage(
        loadError,
        eventId ? 'Stand requests could not be loaded.' : 'Vendor applications could not be loaded.',
      ));
    }
  }, [eventId]);

  useEffect(() => {
    let active = true;
    loadApplications(eventId)
      .then(data => {
        if (active) setApplications(data);
      })
      .catch(loadError => {
        if (active) {
          setError(responseMessage(
            loadError,
            eventId ? 'Stand requests could not be loaded.' : 'Vendor applications could not be loaded.',
          ));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [eventId]);

  const eventOptions = useMemo(() => {
    const options = new Map<string, string>();
    applications.forEach(application => {
      if (application.event) options.set(application.event.id, application.event.title);
    });
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return applications.filter(application => {
      if (statusFilter !== 'ALL' && application.status !== statusFilter) return false;
      if (eventFilter !== 'ALL' && application.eventId !== eventFilter) return false;
      if (!query) return true;
      const profile = application.vendor?.vendorProfile;
      return [
        profile?.businessName,
        application.companyName,
        application.vendor?.firstname,
        application.vendor?.lastname,
        application.vendor?.email,
        application.event?.title,
      ].some(value => value?.toLocaleLowerCase().includes(query));
    });
  }, [applications, eventFilter, search, statusFilter]);

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
    <OrganizerPageLayout
      title={eventId ? 'Stand requests' : 'Vendor applications'}
      subtitle="Review vendor profiles, requested setups, and supporting information."
      breadcrumbs={eventId
        ? [{ label: 'My events', to: '/organizer/events' }, { label: 'Stand requests' }]
        : [{ label: 'Vendor applications' }]}
    >
          {!eventId && (
            <section className="mb-5 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3">
              <label className="text-xs font-semibold text-neutral-600">
                Search applications
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Vendor, contact, or event" className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-normal text-neutral-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="text-xs font-semibold text-neutral-600">
                Event
                <select value={eventFilter} onChange={event => setEventFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-normal text-neutral-800 outline-none focus:border-violet-400">
                  <option value="ALL">All events</option>
                  {eventOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-neutral-600">
                Status
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as VendorApplication['status'] | 'ALL')} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-normal text-neutral-800 outline-none focus:border-violet-400">
                  <option value="ALL">All statuses</option>
                  <option value="PENDING_REVIEW">Pending review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
            </section>
          )}
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
          {loading ? (
            <p role="status" className="py-10 text-center text-neutral-500">Loading stand requests…</p>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">{applications.length === 0 ? 'No vendor applications yet' : 'No matching applications'}</h2>
              <p className="mt-2 text-sm text-neutral-600">{applications.length === 0 ? 'Applications for your events will appear here.' : 'Try changing your search or filters.'}</p>
              <Link to="/organizer/events" className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline">Back to events</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredApplications.map(application => {
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
                      {!eventId && application.event && (
                        <div className="md:col-span-2">
                          <Link to={`/organizer/events/${application.event.id}/vendors`} className="text-sm font-semibold text-violet-700 hover:text-violet-900">
                            {application.event.title} · {new Date(application.event.date).toLocaleDateString()} · {application.event.venue}
                          </Link>
                        </div>
                      )}
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
                          <div><dt className="font-medium text-neutral-600">Area and estimated charge</dt><dd className="mt-1 text-neutral-800">{Number(application.standAreaSqm).toFixed(2)} m² × ZAR {Number(application.standRatePerSqm).toFixed(2)} = ZAR {Number(application.quotedAmount).toFixed(2)}</dd></div>
                          <div>
                            <dt className="font-medium text-neutral-600">Staff ({application.staffMembers?.length ?? 0})</dt>
                            <dd className="mt-1 text-neutral-800">{application.staffMembers?.length ? application.staffMembers.map(member => `${member.name} (${member.email})`).join(', ') : 'None listed'}</dd>
                          </div>
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
                          <Button type="submit" size="sm" loading={approvingId === application.id} disabled={Boolean(approvingId || rejectingId)}>Approve, assign and invoice</Button>
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
    </OrganizerPageLayout>
  );
}
