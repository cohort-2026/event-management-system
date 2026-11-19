import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSearchField from '@/components/layout/VendorSearchField';
import Button from '@/components/legacy/Button';
import { getEventById } from '@/services/eventService';
import { applyForStand, getMyApplications, getVendorProfile } from '@/services/vendorService';
import type { Event } from '@/types/event';
import type { VendorApplication, VendorProfile } from '@/types/vendor';

interface ApplicationStaffMember {
  name: string;
  email: string;
}

const standOptions = [
  { type: 'Standard', size: '3m x 3m', width: 3, depth: 3 },
  { type: 'Double', size: '3m x 6m', width: 3, depth: 6 },
];

export default function ApplyForStand() {
  const { id: eventId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [requestedStandType, setRequestedStandType] = useState(standOptions[0].type);
  const [requestedStandSize, setRequestedStandSize] = useState(standOptions[0].size);
  const [standDescription, setStandDescription] = useState('');
  const [powerNeeded, setPowerNeeded] = useState('');
  const [foodHandling, setFoodHandling] = useState('');
  const [supportingInformation, setSupportingInformation] = useState('');
  const [staffMembers, setStaffMembers] = useState<ApplicationStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!eventId) return;

    Promise.all([getVendorProfile(), getMyApplications(), getEventById(eventId)])
      .then(([profileResponse, applicationsResponse, eventResponse]) => {
        if (!active) return;
        const loadedApplications = applicationsResponse.data.data;
        setProfile(profileResponse.data.data);
        setApplications(loadedApplications);
        setEvent(eventResponse.data.data);
        const previousApplication = loadedApplications
          .filter(application => application.eventId === eventId && application.status === 'REJECTED')
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
        setRequestedStandType(previousApplication?.requestedStandType ?? standOptions[0].type);
        setRequestedStandSize(previousApplication?.requestedStandSize ?? standOptions[0].size);
        setStandDescription(previousApplication?.standDescription ?? '');
        setSupportingInformation(previousApplication?.supportingInformation ?? '');
        setStaffMembers(previousApplication?.staffMembers?.map(({ name, email }) => ({ name, email })) ?? []);
        const latestRejected = applicationsResponse.data.data
          .filter(application => application.eventId === eventId && application.status === 'REJECTED')
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
        const hasActiveApplication = applicationsResponse.data.data.some(application =>
          application.eventId === eventId && application.status !== 'REJECTED',
        );
        if (!hasActiveApplication && latestRejected) {
          setRequestedStandType(latestRejected.requestedStandType);
          setRequestedStandSize(latestRejected.requestedStandSize);
          setStandDescription(latestRejected.standDescription);
          setSupportingInformation(latestRejected.supportingInformation ?? '');
          setStaffMembers(latestRejected.staffMembers?.map(({ name, email }) => ({ name, email })) ?? []);
        }
      })
      .catch(() => {
        if (active) setError('Unable to load this event and your business profile. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [eventId]);

  const activeApplication = useMemo(() => applications.find(application =>
    application.eventId === eventId && application.status !== 'REJECTED',
  ), [applications, eventId]);
  const rejectedApplication = useMemo(() => applications
    .filter(application => application.eventId === eventId && application.status === 'REJECTED')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0],
  [applications, eventId]);

  const dimensions = /^(\d{1,3}(?:\.\d{1,2})?)\s*m?\s*[x×]\s*(\d{1,3}(?:\.\d{1,2})?)\s*m?$/i.exec(requestedStandSize);
  const standWidth = dimensions ? Number(dimensions[1]) : 0;
  const standDepth = dimensions ? Number(dimensions[2]) : 0;
  const standArea = standWidth * standDepth;
  const ratePerSquareMetre = Number(event?.vendorStandRatePerSqm ?? 0);
  const quote = Math.round(standArea * ratePerSquareMetre * 100) / 100;
  const selectedPreset = standOptions.find(option => option.size === requestedStandSize && option.type === requestedStandType);
  const customSize = !selectedPreset;

  const selectStand = (type: string, size: string) => {
    setRequestedStandType(type);
    setRequestedStandSize(size);
    setError('');
  };

  const submitApplication = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!eventId) {
      setError('This event could not be found.');
      return;
    }
    if (!dimensions || standWidth <= 0 || standDepth <= 0 || standWidth > 100 || standDepth > 100) {
      setError('Enter a valid stand size in metres, such as 3m x 3m.');
      return;
    }
    if (standDescription.trim().length < 10) {
      setError('Describe what you plan to sell or show (at least 10 characters).');
      return;
    }

    const applicationDetails = [
      powerNeeded.trim() && `Power needed: ${powerNeeded.trim()}`,
      foodHandling.trim() && `Food handling: ${foodHandling.trim()}`,
      supportingInformation.trim(),
    ].filter(Boolean).join('\n');
    if (applicationDetails.length > 2000) {
      setError('Supporting information must be no more than 2000 characters.');
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
        standDescription: standDescription.trim(),
        supportingInformation: applicationDetails,
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

  if (!eventId) {
    return <PageWrapper><p role="alert" className="text-sm font-medium text-rose-700">This event could not be found.</p></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className="vendor-apply-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />

          <div className="min-w-0 flex-1">
            <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between gap-2 border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-1">
              <VendorMenuButton />
              <nav className="flex min-w-0 items-center gap-1 text-[8px] font-semibold" aria-label="Breadcrumb">
                <Link to="/vendor/events" className="shrink-0 text-[#777] hover:text-[#171717]">Find events</Link>
                <span className="text-[#aaa]">/</span>
                <span className="truncate text-[#777]">{event?.title ?? 'Event'}</span>
                <span className="text-[#aaa]">/</span>
                <span className="shrink-0 text-[#222]">Apply</span>
              </nav>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-3.5 pb-4 pt-2">
              {loading ? (
                <p role="status" className="py-10 text-center text-[9px] text-neutral-500">Loading event and business profile…</p>
              ) : error && !event ? (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[9px] font-medium text-rose-700">{error}</p>
              ) : !profile?.businessName ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <h2 className="text-[10px] font-bold text-neutral-900">Complete your business profile first</h2>
                  <p className="mt-1 text-[8px] text-neutral-700">Your saved business details are included with the stand request.</p>
                  <Link to="/vendor/profile" className="mt-2 inline-flex text-[8px] font-semibold text-brand-700 hover:text-brand-900">Open business profile</Link>
                </div>
              ) : event && (
                <div className="grid items-start gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <aside className="space-y-2">
                    <article className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      <div className="relative h-[66px] overflow-hidden bg-gradient-to-br from-[#ff8c63] via-[#f14b2d] to-[#f97316]">
                        {event.bannerImageUrl && <img src={event.bannerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        {!event.bannerImageUrl && (
                          <>
                            <span className="absolute -left-5 top-6 h-16 w-16 rounded-full bg-[#ffb45c]" />
                            <span className="absolute left-[27%] top-8 h-20 w-20 rounded-full bg-[#ad2c18]/75" />
                            <span className="absolute right-2 -top-5 h-12 w-12 rounded-full bg-[#ffb46b]/70" />
                          </>
                        )}
                        <div className="absolute left-1 top-1 flex min-h-10 min-w-10 flex-col items-center justify-center rounded-md bg-white text-[#222] shadow-sm">
                          <span className="text-[6px] font-bold leading-[7px] text-rose-600">
                            {new Date(event.startTime).toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-extrabold leading-[10px]">
                            {new Date(event.startTime).toLocaleDateString('en-ZA', { day: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <h2 className="truncate text-[9px] font-extrabold leading-3 text-neutral-900">{event.title}</h2>
                        <p className="mt-0.5 truncate text-[7px] leading-[9px] text-neutral-500">
                          {new Date(event.startTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          {' · '}{event.venue}
                        </p>
                        <dl className="mt-2 space-y-1 text-[7px] leading-[9px]">
                          <InfoRow label="Expected" value={`${event.capacity.toLocaleString()} attendees`} />
                          <InfoRow label="Stands left" value={`${event.availableVendorStands} of ${event.vendorStandsAvailable}`} />
                          <InfoRow label="Rate" value={`${formatRate(ratePerSquareMetre)}/m²`} />
                          <InfoRow label="Event time" value={`${formatTime(event.startTime)} – ${formatTime(event.endTime)}`} />
                        </dl>
                      </div>
                    </article>

                    <article className="rounded-lg border border-neutral-200 bg-white p-2">
                      <h3 className="text-[8px] font-extrabold leading-3 text-neutral-900">What happens next</h3>
                      <ol className="mt-1 list-inside list-decimal space-y-0.5 text-[7px] leading-[9px] text-neutral-600">
                        <li>The organizer reviews your application.</li>
                        <li>If approved, you get a stand number and an invoice.</li>
                        <li>Pay within 7 days to keep your stand.</li>
                        <li>Add your staff to get door passes.</li>
                      </ol>
                    </article>
                  </aside>

                  <section className="rounded-lg border border-neutral-200 bg-white p-2.5">
                    <div className="mb-2">
                      <h2 className="text-[11px] font-extrabold leading-4 text-neutral-900">Apply for a stand</h2>
                      <p className="text-[7px] leading-[10px] text-neutral-500">
                        Applying as <span className="font-bold text-neutral-800">{profile.businessName}</span>
                        {profile.businessRegistrationNumber && ` · ${profile.businessRegistrationNumber}`}
                      </p>
                    </div>

                    {activeApplication ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                        <h3 className="text-[9px] font-semibold text-amber-950">
                          You already have a {activeApplication.status.toLowerCase().replace('_', ' ')} application for this event.
                        </h3>
                        {activeApplication.assignedStand && <p className="mt-1 text-[8px] text-amber-900">Assigned stand: {activeApplication.assignedStand}</p>}
                        <Link to="/vendor/applications" className="mt-1 inline-flex text-[8px] font-semibold text-brand-700 underline">View your applications</Link>
                      </div>
                    ) : event.availableVendorStands === 0 ? (
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 text-[9px] text-neutral-700">
                        All vendor stands for this event have been allocated.
                      </div>
                    ) : (
                      <form onSubmit={submitApplication} className="space-y-2">
                        {rejectedApplication && (
                          <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-[8px] text-rose-800">
                            <h3 className="font-semibold">Update your rejected application</h3>
                            {rejectedApplication.rejectionReason && <p className="mt-1 whitespace-pre-line">{rejectedApplication.rejectionReason}</p>}
                            <p className="mt-1 text-[7px]">Your previous request is preserved. Submitting creates a new application.</p>
                          </div>
                        )}

                        <fieldset>
                          <legend className="mb-1 text-[8px] font-bold leading-[10px] text-neutral-800">Stand size</legend>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {standOptions.map(option => {
                              const area = option.width * option.depth;
                              return (
                                <label
                                  key={option.size}
                                  className={`flex min-h-14 cursor-pointer items-center justify-between gap-1.5 rounded-md border px-2 py-2 transition ${
                                    requestedStandSize === option.size
                                      ? 'border-rose-600 ring-1 ring-rose-600'
                                      : 'border-neutral-200 hover:border-neutral-400'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="standSize"
                                    checked={requestedStandSize === option.size}
                                    onChange={() => selectStand(option.type, option.size)}
                                    className="sr-only"
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate text-[8px] font-bold leading-[10px] text-neutral-900">{option.type} · {option.size}</span>
                                    <span className="mt-0.5 block truncate text-[7px] leading-[9px] text-neutral-500">
                                      {area} m² · {formatRate(ratePerSquareMetre)}/m² · {option.type === 'Standard' ? '2 staff passes' : '4 staff passes'}
                                    </span>
                                  </span>
                                  <span className={`h-3 w-3 shrink-0 rounded-full border ${
                                    requestedStandSize === option.size ? 'border-[3px] border-rose-600' : 'border-neutral-300'
                                  }`} />
                                </label>
                              );
                            })}
                            {customSize && (
                              <label className="flex min-h-14 items-center justify-between gap-1.5 rounded-md border border-rose-600 px-2 py-2 ring-1 ring-rose-600 sm:col-span-2">
                                <span>
                                  <span className="block text-[8px] font-bold text-neutral-900">Previous request · {requestedStandType}</span>
                                  <span className="block text-[7px] text-neutral-500">Revise this size or choose a preset.</span>
                                </span>
                                <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-rose-600" />
                              </label>
                            )}
                          </div>
                          {customSize && (
                            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                              <label className="text-[8px] font-semibold text-neutral-700">
                                Stand type
                                <input value={requestedStandType} onChange={formEvent => setRequestedStandType(formEvent.target.value)} required minLength={2} maxLength={80} className={inputClassName} />
                              </label>
                              <label className="text-[8px] font-semibold text-neutral-700">
                                Size (width × depth, metres)
                                <input value={requestedStandSize} onChange={formEvent => setRequestedStandSize(formEvent.target.value)} required minLength={2} maxLength={80} className={inputClassName} />
                              </label>
                            </div>
                          )}
                        </fieldset>

                        <label className="block text-[8px] font-bold leading-[10px] text-neutral-800">
                          What will you sell or show?
                          <textarea
                            required
                            minLength={10}
                            maxLength={2000}
                            rows={1}
                            value={standDescription}
                            onChange={formEvent => setStandDescription(formEvent.target.value)}
                            placeholder="Describe the products or services you will offer at this event."
                            className={`${inputClassName} !h-20 resize-y py-2`}
                          />
                        </label>

                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <label className="block text-[8px] font-bold leading-[10px] text-neutral-800">
                            Power needed
                            <input value={powerNeeded} onChange={formEvent => setPowerNeeded(formEvent.target.value)} maxLength={300} placeholder="e.g. One 15A plug point" className={inputClassName} />
                          </label>
                          <label className="block text-[8px] font-bold leading-[10px] text-neutral-800">
                            Handling food?
                            <input value={foodHandling} onChange={formEvent => setFoodHandling(formEvent.target.value)} maxLength={300} placeholder="Yes · certificate on file" className={inputClassName} />
                          </label>
                        </div>

                        <details className="rounded-md border border-neutral-200 px-2 py-1">
                          <summary className="cursor-pointer text-[7px] font-semibold text-neutral-600">Staff passes and additional information (optional)</summary>
                          <div className="space-y-2 pt-2">
                            <label className="block text-[8px] font-bold text-neutral-800">
                              Other information
                              <textarea
                                maxLength={2000}
                                rows={2}
                                value={supportingInformation}
                                onChange={formEvent => setSupportingInformation(formEvent.target.value)}
                                placeholder="Anything else the organizer should know."
                                className={`${inputClassName} !h-auto py-1.5`}
                              />
                            </label>
                            <section className="space-y-1.5 border-t border-neutral-100 pt-2">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <h3 className="text-[8px] font-bold text-neutral-900">Staff passes</h3>
                                  <p className="text-[7px] text-neutral-500">Add the people who will work at your stand. Up to 20.</p>
                                </div>
                                <Button type="button" variant="secondary" size="sm" disabled={staffMembers.length >= 20} onClick={() => setStaffMembers(current => [...current, { name: '', email: '' }])}>
                                  + Add staff
                                </Button>
                              </div>
                              {staffMembers.map((member, index) => (
                                <div key={index} className="grid gap-1.5 rounded-md border border-neutral-200 p-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                  <label className="block text-[8px] font-semibold text-neutral-700">
                                    Name
                                    <input required minLength={2} maxLength={120} value={member.name} onChange={formEvent => setStaffMembers(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: formEvent.target.value } : item))} className={inputClassName} />
                                  </label>
                                  <label className="block text-[8px] font-semibold text-neutral-700">
                                    Email
                                    <input required type="email" maxLength={254} value={member.email} onChange={formEvent => setStaffMembers(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: formEvent.target.value } : item))} className={inputClassName} />
                                  </label>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setStaffMembers(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove staff member ${index + 1}`}>
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </section>
                          </div>
                        </details>

                        <div className="flex min-h-[36px] items-center justify-between gap-2 rounded-md bg-neutral-950 px-2.5 py-1.5 text-white">
                          <div>
                            <p className="text-[7px] leading-[9px] text-white/70">Your quote</p>
                            <p className="mt-0.5 text-[7px] leading-[9px]">{standArea.toLocaleString()} m² × {formatRate(ratePerSquareMetre)} per m²</p>
                          </div>
                          <p className="text-[16px] font-black leading-5">{formatCurrency(quote)}</p>
                        </div>

                        {error && <p role="alert" className="text-[8px] font-medium text-rose-700">{error}</p>}
                        {message && <p role="status" className="text-[8px] font-medium text-emerald-700">{message} <Link to="/vendor/applications" className="underline">View my applications</Link></p>}
                        <div className="flex justify-end gap-1.5">
                          <Link to="/vendor/events" className="vendor-button inline-flex min-h-10 items-center rounded border border-neutral-200 px-3 text-[7px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</Link>
                          <Button type="submit" className="!min-h-10 !rounded !px-3 text-[7px] bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600" loading={submitting} disabled={Boolean(message)}>
                            Send application
                          </Button>
                        </div>
                      </form>
                    )}
                  </section>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-semibold text-neutral-800">{value}</dd>
    </div>
  );
}

const inputClassName = 'mt-1 h-10 w-full rounded border border-neutral-300 bg-white px-2 py-0 text-[8px] font-normal text-neutral-800 outline-none focus:border-rose-500';

function formatCurrency(value: number) {
  const amount = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `R${amount.replace(/\u00a0/g, ' ').replace(',', '.')}`;
}

function formatRate(value: number) {
  return `R${new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 }).format(value)}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
