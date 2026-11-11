import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import Button from '@/components/ui/Button';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { getEventById } from '@/services/eventService';
import { applyForStand, getMyApplications, getVendorProfile } from '@/services/vendorService';
import type { Event } from '@/types/event';
import type { VendorApplication, VendorProfile } from '@/types/vendor';

interface ApplicationStaffMember {
  name: string;
  email: string;
}

export default function ApplyForStand() {
  const { id: eventId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [requestedStandType, setRequestedStandType] = useState('Standard');
  const [requestedStandSize, setRequestedStandSize] = useState('');
  const [standDescription, setStandDescription] = useState('');
  const [supportingInformation, setSupportingInformation] = useState('');
  const [staffMembers, setStaffMembers] = useState<ApplicationStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getVendorProfile(), getMyApplications(), eventId ? getEventById(eventId) : Promise.reject(new Error('Event ID is missing'))])
      .then(([profileResponse, applicationsResponse, eventResponse]) => {
        setCurrentTime(Date.now());
        setProfile(profileResponse.data.data);
        setApplications(applicationsResponse.data.data);
        setEvent(eventResponse.data.data);
        const latestRejected = applicationsResponse.data.data
          .filter(application => application.eventId === eventId && application.status === 'REJECTED')
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
        if (latestRejected) {
          setRequestedStandType(latestRejected.requestedStandType);
          setRequestedStandSize(latestRejected.requestedStandSize);
          setStandDescription(latestRejected.standDescription);
          setSupportingInformation(latestRejected.supportingInformation ?? '');
          setStaffMembers(latestRejected.staffMembers?.map(({ name, email }) => ({ name, email })) ?? []);
        }
      })
      .catch(() => setError('Unable to load this event and your business profile.'))
      .finally(() => setLoading(false));
  }, [eventId]);

  const activeApplication = useMemo(() => applications.find(application =>
    application.eventId === eventId && application.status !== 'REJECTED',
  ), [applications, eventId]);
  const rejectedApplication = useMemo(() => applications
    .filter(application => application.eventId === eventId && application.status === 'REJECTED')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0],
  [applications, eventId]);
  const applicationsOpen = Boolean(event
    && event.status === 'PUBLISHED'
    && currentTime !== null
    && new Date(event.startTime || event.date).getTime() > currentTime
    && event.availableVendorStands > 0);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId) {
      setError('This event could not be found.');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await applyForStand({
        eventId,
        requestedStandType,
        requestedStandSize,
        standDescription,
        supportingInformation,
        staffMembers,
      });
      setMessage('Your stand request has been submitted.');
    } catch (requestError) {
      const responseMessage = axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data.message
        : undefined;
      setError(responseMessage ?? 'Unable to submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VendorPortalLayout businessName={profile?.businessName ?? 'Vendor'} title="Apply for a stand" subtitle={event ? `Submit an application to participate in ${event.title}.` : 'Tell the organizer what you need for your event stand.'}>
        <section className="mx-auto w-full max-w-4xl">

          {loading ? (
            <p role="status" className="py-10 text-center text-neutral-500">Loading your business profile…</p>
          ) : error && !profile ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>
          ) : !profile?.businessName ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-bold text-neutral-900">Complete your business profile first</h2>
              <p className="mt-2 text-sm text-neutral-700">Your business name is required and your saved details are included with the request.</p>
              <Link to="/vendor/profile" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-900">Open business profile</Link>
            </div>
          ) : !applicationsOpen ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#171823]">
              <h2 className="font-bold text-slate-900 dark:text-white">Applications are closed</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This event is not published, has started, or has no vendor spaces available. Applications can only be submitted for published future events with available stands.</p>
              <Link to="/vendor/events" className="mt-4 inline-flex text-sm font-semibold text-violet-700 dark:text-violet-300">Back to events</Link>
            </div>
          ) : (
            <div className="max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Applying as</p>
                  <h2 className="mt-1 text-xl font-bold text-neutral-900">{profile.businessName}</h2>
                </div>
                <Link to="/vendor/profile" className="text-sm font-semibold text-brand-700 hover:text-brand-900">Edit profile</Link>
              </div>
              <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Registration number</dt><dd className="mt-1 text-sm text-neutral-800">{profile.businessRegistrationNumber || 'Not provided'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contact person</dt><dd className="mt-1 text-sm text-neutral-800">{profile.contactPerson || 'Not provided'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Business email</dt><dd className="mt-1 break-all text-sm text-neutral-800">{profile.contactEmail || 'Not provided'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Phone</dt><dd className="mt-1 text-sm text-neutral-800">{profile.contactPhone || 'Not provided'}</dd></div>
              </dl>
              {event && (
                <p className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                  <span className="font-semibold">{event.availableVendorStands}</span> vendor stand{event.availableVendorStands === 1 ? '' : 's'} available for {event.title}.
                </p>
              )}
              {activeApplication ? (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-semibold text-amber-950">You already have a {activeApplication.status.toLowerCase().replace('_', ' ')} request for this event.</h3>
                  {activeApplication.assignedStand && <p className="mt-1 text-sm text-amber-900">Assigned stand: {activeApplication.assignedStand}</p>}
                  <Link to="/vendor/applications" className="mt-2 inline-flex text-sm font-semibold text-brand-700 underline">View your requests</Link>
                </div>
              ) : event?.availableVendorStands === 0 ? (
                <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                  All vendor stands for this event have been allocated.
                </div>
              ) : (
                <form className="mt-6 space-y-4 border-t border-neutral-100 pt-5" onSubmit={submitApplication}>
                  {rejectedApplication && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                      <h3 className="font-semibold text-rose-900">Update your rejected request</h3>
                      {rejectedApplication.rejectionReason && <p className="mt-1 whitespace-pre-line text-sm text-rose-800">Organizer feedback: {rejectedApplication.rejectionReason}</p>}
                      <p className="mt-1 text-xs text-rose-800">Your previous request is preserved. Submitting creates a new request with your corrections.</p>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Stand type
                      <input required minLength={2} maxLength={80} value={requestedStandType} onChange={event => setRequestedStandType(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                    </label>
                    <label className="block text-sm font-medium text-neutral-700">
                      Requested size (width x depth, metres)
                      <input required minLength={2} maxLength={80} value={requestedStandSize} onChange={event => setRequestedStandSize(event.target.value)} placeholder="e.g. 3m x 3m" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                    </label>
                  </div>
                  <p className="-mt-2 text-xs text-neutral-500">An invoice is calculated from the requested area and sent if the organizer approves your stand.</p>
                  <label className="block text-sm font-medium text-neutral-700">
                    Stand requirements and setup
                    <textarea required minLength={10} maxLength={2000} rows={4} value={standDescription} onChange={event => setStandDescription(event.target.value)} placeholder="Describe your setup, equipment, power needs, and how you will use the stand." className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium text-neutral-700">
                    Supporting information <span className="font-normal text-neutral-500">(optional)</span>
                    <textarea maxLength={2000} rows={3} value={supportingInformation} onChange={event => setSupportingInformation(event.target.value)} placeholder="Add any other information the organizer should consider." className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                  </label>
                  <section className="space-y-3 border-t border-neutral-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">Staff members</h3>
                        <p className="mt-1 text-xs text-neutral-500">Add the people who will work at your stand. Up to 20.</p>
                      </div>
                      <Button type="button" variant="secondary" size="sm" disabled={staffMembers.length >= 20} onClick={() => setStaffMembers(current => [...current, { name: '', email: '' }])}>Add staff</Button>
                    </div>
                    {staffMembers.map((member, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border border-neutral-200 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <label className="block text-sm font-medium text-neutral-700">
                          Name
                          <input required minLength={2} maxLength={120} value={member.name} onChange={event => setStaffMembers(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                        </label>
                        <label className="block text-sm font-medium text-neutral-700">
                          Email
                          <input required type="email" maxLength={254} value={member.email} onChange={event => setStaffMembers(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
                        </label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setStaffMembers(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove staff member ${index + 1}`}>Remove</Button>
                      </div>
                    ))}
                  </section>
                  {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
                  {message && <p role="status" className="text-sm font-medium text-emerald-700">{message} <Link to="/vendor/applications" className="underline">View my requests</Link></p>}
                  <Button type="submit" className="mt-2" loading={submitting} disabled={Boolean(message)}>Submit stand request</Button>
                </form>
              )}
            </div>
          )}
        </section>
    </VendorPortalLayout>
  );
}
