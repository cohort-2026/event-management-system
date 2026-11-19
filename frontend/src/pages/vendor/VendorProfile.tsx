import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import PageWrapper from '@/components/layout/PageWrapper';
import Button from '@/components/legacy/Button';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { useAuth } from '@/context/useAuth';
import {
  deleteVendorDocument,
  downloadVendorDocument,
  getVendorDocuments,
  getVendorProfile,
  updateVendorProfile,
  uploadVendorDocument,
} from '@/services/vendorService';
import type { ApiError } from '@/types/api';
import type { UpdateVendorProfileDto, VendorDocument, VendorProfile } from '@/types/vendor';

const businessRegistrationRegex = /^\d{4}\/\d{6}\/\d{2}$/;
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const phoneCountries = getCountries()
  .map(country => ({ country, name: countryNames.of(country) ?? country, callingCode: getCountryCallingCode(country) }))
  .sort((left, right) => left.name.localeCompare(right.name));

const emptyProfile: UpdateVendorProfileDto & Pick<VendorProfile, 'status' | 'rejectionReason' | 'reviewedAt'> = {
  businessName: '',
  businessType: '',
  businessAddress: '',
  businessDescription: '',
  businessRegistrationNumber: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  productsServices: [],
  supportingDocumentUrls: [],
  status: 'DRAFT',
  rejectionReason: null,
  reviewedAt: null,
};

export default function VendorProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<UpdateVendorProfileDto & Pick<VendorProfile, 'status' | 'rejectionReason' | 'reviewedAt'>>(emptyProfile);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('ZA');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serviceDraft, setServiceDraft] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentMessage, setDocumentMessage] = useState('');
  const [documentError, setDocumentError] = useState('');
  const isApproved = profile.status === 'APPROVED';
  const isDraft = profile.status === 'DRAFT';
  const isRejected = profile.status === 'REJECTED';
  const isPending = profile.status === 'PENDING_REVIEW';
  const isEditable = !isApproved && !isPending;

  useEffect(() => {
    let active = true;
    getVendorProfile()
      .then(profileResponse => {
        if (!active) return;
        const data = profileResponse.data.data;
        setProfile(data);
        const parsedPhone = parsePhoneNumberFromString(data.contactPhone, 'ZA');
        if (parsedPhone) {
          setPhoneCountry(parsedPhone.country ?? 'ZA');
          setPhoneNumber(parsedPhone.nationalNumber);
        } else {
          setPhoneNumber(data.contactPhone);
        }
      })
      .catch(() => { if (active) setLoadError('Unable to load your business profile. Please try again.'); })
      .finally(() => {
        if (active) setLoading(false);
      });

    getVendorDocuments()
      .then(response => { if (active) setDocuments(response.data.data); })
      .catch(() => { if (active) setDocumentError('Unable to load your uploaded documents.'); });

    return () => { active = false; };
  }, []);

  const updateField = <K extends keyof UpdateVendorProfileDto>(key: K, value: UpdateVendorProfileDto[K]) => {
    setProfile(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key]: '' }));
    setSaveMessage('');
    setSaveFailed(false);
  };

  const addProductOrService = () => {
    const item = serviceDraft.trim();
    if (!item) return;
    if (item.length > 100) {
      setServiceError('Each item must be 100 characters or fewer.');
      return;
    }
    if (profile.productsServices.length >= 20) {
      setServiceError('You can add up to 20 items.');
      return;
    }
    if (profile.productsServices.some(existing => existing.toLowerCase() === item.toLowerCase())) {
      setServiceError('This item has already been added.');
      return;
    }
    updateField('productsServices', [...profile.productsServices, item]);
    setServiceDraft('');
    setServiceError('');
  };

  const removeProductOrService = (itemToRemove: string) => {
    updateField('productsServices', profile.productsServices.filter(item => item !== itemToRemove));
  };

  const uploadDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.currentTarget;
    const file = fileInput.files?.[0];
    if (!file) return;

    setDocumentError('');
    setDocumentMessage('');
    if (documents.length >= 10) {
      setDocumentError('You can upload up to 10 documents.');
      fileInput.value = '';
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setDocumentError('Choose a PDF document.');
      fileInput.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocumentError('PDF files must be 10 MB or smaller.');
      fileInput.value = '';
      return;
    }

    setUploading(true);
    try {
      const response = await uploadVendorDocument(file);
      setDocuments(current => [response.data.data, ...current]);
      setDocumentMessage('PDF uploaded.');
    } catch (error) {
      const message = axios.isAxiosError<ApiError>(error) ? error.response?.data.message : undefined;
      setDocumentError(message ?? 'Unable to upload this PDF. Please try again.');
    } finally {
      setUploading(false);
      fileInput.value = '';
    }
  };

  const viewDocument = async (document: VendorDocument) => {
    setDocumentError('');
    try {
      const response = await downloadVendorDocument(document.id);
      const url = window.URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      setDocumentError('Unable to open this PDF. Please try again.');
    }
  };

  const removeDocument = async (document: VendorDocument) => {
    if (!isEditable || !window.confirm(`Remove ${document.originalName}?`)) return;
    setDocumentError('');
    setDocumentMessage('');

    try {
      await deleteVendorDocument(document.id);
      setDocuments(current => current.filter(item => item.id !== document.id));
      setDocumentMessage('PDF removed.');
    } catch {
      setDocumentError('Unable to remove this PDF. Please try again.');
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const submitForReview = submitter instanceof HTMLButtonElement && submitter.value === 'submit-review';
    setSaveMessage('');
    setSaveFailed(false);

    const errors: Record<string, string> = {};
    if (profile.businessName.trim().length < 2) errors.businessName = 'Enter a business name of at least 2 characters.';
    if (profile.contactPerson.trim().length < 2) errors.contactPerson = 'Enter a contact person of at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) errors.contactEmail = 'Enter a valid email address.';
    const registrationNumber = profile.businessRegistrationNumber.trim();
    if (registrationNumber && !businessRegistrationRegex.test(registrationNumber)) {
      errors.businessRegistrationNumber = 'Use the format 2020/123456/07.';
    }
    if (submitForReview && profile.businessType.trim().length < 2) errors.businessType = 'Enter a business type or category.';
    if (submitForReview && profile.businessAddress.trim().length < 5) errors.businessAddress = 'Enter a business address.';
    if (submitForReview && profile.businessDescription.trim().length < 20) errors.businessDescription = 'Enter a business description of at least 20 characters.';
    const parsedPhone = parsePhoneNumberFromString(phoneNumber, phoneCountry);
    const normalizedPhone = parsedPhone?.isValid() ? parsedPhone.number : '';
    if (!normalizedPhone) errors.contactPhone = `Enter a valid phone number for ${countryNames.of(phoneCountry) ?? phoneCountry}.`;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSaveMessage('Please check the highlighted fields.');
      setSaveFailed(true);
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const response = await updateVendorProfile({ ...profile, contactPhone: normalizedPhone }, submitForReview);
      setProfile(response.data.data);
      if (user?.role === 'VENDOR') setUser({ ...user, vendorProfileStatus: response.data.data.status });
      setSaveMessage(response.data.message ?? 'Business profile saved.');
    } catch (error) {
      if (axios.isAxiosError<{ message: string; errors?: Record<string, string | string[]> }>(error) && error.response?.status === 400) {
        setFieldErrors(Object.fromEntries(
          Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [
            field, typeof messages === 'string' ? messages : messages[0] ?? '',
          ])
        ));
      }
      setSaveFailed(true);
      setSaveMessage(
        axios.isAxiosError<ApiError>(error)
          ? error.response?.data.message ?? 'Unable to save your profile. Please try again.'
          : 'Unable to save your profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div className="vendor-profile-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar accountSubtitle={profile.businessName || user?.email} />

          <div className="min-w-0 flex-1">
            <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-2">
                <VendorMenuButton />
                <span className="truncate text-[12px] font-semibold text-[#333]">Business profile</span>
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="bg-[#fbfaf9] px-3.5 pb-4 pt-3.5">
              {loading ? (
                <div className="flex min-h-[50vh] items-center justify-center" role="status">Loading business profile…</div>
              ) : loadError ? (
                <p role="alert" className="text-sm font-medium text-rose-700">{loadError}</p>
              ) : (
                <>
              {isApproved ? (
                <div className="mb-2 flex min-h-[43px] flex-wrap items-center justify-between gap-2 rounded-lg border border-[#b8f1dc] bg-[#edfcf6] px-2.5 py-1.5 text-[#075f4d]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[#0b9a79]"><CheckIcon /></span>
                    <div>
                      <p className="text-[13px] font-bold leading-[11px]">Approved vendor</p>
                      <p className="text-[12px] leading-4">
                        {profile.reviewedAt ? `Approved on ${new Date(profile.reviewedAt).toLocaleDateString()}. ` : ''}
                        You can apply for stands at any event.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Approved business profiles cannot be edited by the current backend."
                    className="h-[20px] shrink-0 rounded border border-[#d6e8e2] bg-white px-2 text-[12px] font-semibold text-[#333] disabled:cursor-not-allowed"
                  >
                    Request a change
                  </button>
                </div>
              ) : isRejected ? (
                <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  <p className="font-bold">Profile needs attention</p>
                  <p className="mt-1">{profile.rejectionReason ?? 'Update your business profile and submit it for review again.'}</p>
                </div>
              ) : (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-bold">{isDraft ? 'Draft profile' : 'Profile under review'}</p>
                  <p className="mt-1">
                    {isDraft
                      ? 'Complete your business details and submit your profile for approval.'
                      : 'Your profile is being reviewed. You can update it if it is returned for changes.'}
                  </p>
                </div>
              )}

              <form onSubmit={saveProfile} noValidate className="space-y-0">
                <fieldset disabled={!isEditable} className="space-y-0 disabled:opacity-80">
                  <ProfileSection title="Business" description="How organisers will see you.">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Trading name" error={fieldErrors.businessName}>
                        <input
                          required
                          maxLength={120}
                          value={profile.businessName}
                          onChange={event => updateField('businessName', event.target.value)}
                          className={fieldClassName}
                        />
                      </Field>
                      {isApproved ? (
                        <Field label="Products/services" error={fieldErrors.productsServices}>
                          <input value={profile.productsServices.join(', ')} readOnly className={fieldClassName} />
                        </Field>
                      ) : (
                        <Field label="Products/services">
                          <div className="flex min-h-[21px] flex-wrap items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-1">
                            {profile.productsServices.map(item => (
                              <span key={item} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700">
                                {item}
                                <button type="button" onClick={() => removeProductOrService(item)} aria-label={`Remove ${item}`} className="text-slate-400 hover:text-slate-800">×</button>
                              </span>
                            ))}
                            <input
                              value={serviceDraft}
                              onChange={event => setServiceDraft(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  addProductOrService();
                                }
                              }}
                              placeholder="Add"
                              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] outline-none focus:ring-0"
                            />
                            <button type="button" onClick={addProductOrService} className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Add</button>
                          </div>
                          {serviceError && <span role="alert" className="mt-1 block text-[12px] font-normal text-rose-700">{serviceError}</span>}
                        </Field>
                      )}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Field label="Business type or category" error={fieldErrors.businessType}>
                        <input maxLength={100} value={profile.businessType} onChange={event => updateField('businessType', event.target.value)} className={fieldClassName} />
                      </Field>
                      <Field label="Business address" error={fieldErrors.businessAddress}>
                        <input maxLength={500} value={profile.businessAddress} onChange={event => updateField('businessAddress', event.target.value)} className={fieldClassName} />
                      </Field>
                    </div>
                    <div className="mt-2">
                      <Field label="What you offer" error={fieldErrors.businessDescription}>
                        <input
                          maxLength={2000}
                          value={profile.businessDescription}
                          onChange={event => updateField('businessDescription', event.target.value)}
                          className={fieldClassName}
                        />
                      </Field>
                    </div>
                  </ProfileSection>

                  <ProfileSection title="Tax & registration" description="Printed on your invoices.">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="CIPC registration number" error={fieldErrors.businessRegistrationNumber}>
                        <input
                          maxLength={100}
                          value={profile.businessRegistrationNumber}
                          onChange={event => updateField('businessRegistrationNumber', event.target.value)}
                          placeholder="2020/123456/07"
                          className={fieldClassName}
                        />
                      </Field>
                    </div>
                  </ProfileSection>

                  {!isApproved && <ProfileSection title="Contact" description="How organisers can reach you.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Contact person" error={fieldErrors.contactPerson}>
                        <input required maxLength={120} value={profile.contactPerson} onChange={event => updateField('contactPerson', event.target.value)} className={fieldClassName} />
                      </Field>
                      <Field label="Contact email" error={fieldErrors.contactEmail}>
                        <input required type="email" maxLength={254} value={profile.contactEmail} onChange={event => updateField('contactEmail', event.target.value)} className={fieldClassName} />
                      </Field>
                      <Field label="Phone number" error={fieldErrors.contactPhone}>
                        <div className="flex gap-2">
                          <select
                            value={phoneCountry}
                            onChange={event => {
                              setPhoneCountry(event.target.value as CountryCode);
                              setFieldErrors(current => ({ ...current, contactPhone: '' }));
                            }}
                            className="h-[20px] max-w-[46%] rounded border border-slate-300 bg-white px-2 py-0 text-[12px] text-slate-800 focus:border-[#d15d2d] focus:outline-none"
                          >
                            {phoneCountries.map(country => (
                              <option key={country.country} value={country.country}>{country.name} (+{country.callingCode})</option>
                            ))}
                          </select>
                          <input type="tel" value={phoneNumber} onChange={event => {
                            setPhoneNumber(event.target.value);
                            setFieldErrors(current => ({ ...current, contactPhone: '' }));
                          }} className={`${fieldClassName} min-w-0`} />
                        </div>
                      </Field>
                    </div>
                  </ProfileSection>}
                </fieldset>

                <ProfileSection title="Documents" description="Private. Only you and administrators can open them.">
                  {documentError && <p role="alert" className="mb-2 text-[12px] text-rose-700">{documentError}</p>}
                  {documentMessage && <p role="status" className="mb-2 text-[12px] text-emerald-700">{documentMessage}</p>}
                  {documents.length > 0 ? (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {documents.map(document => (
                        <li key={document.id} className="flex min-h-[32px] items-center justify-between gap-2 px-1.5 py-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-rose-50 text-[10px] font-black text-rose-600">PDF</span>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-slate-900">{document.originalName}</p>
                              <p className="text-[11px] text-slate-500">
                                {(document.sizeBytes / 1024).toFixed(0)} KB · {new Date(document.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button type="button" onClick={() => viewDocument(document)} className="h-6 rounded border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">View</button>
                            {isEditable && (
                              <button type="button" onClick={() => removeDocument(document)} className="h-6 rounded border border-rose-200 bg-white px-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Remove</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded border border-dashed border-slate-300 bg-white px-2 py-3 text-center text-[12px] text-slate-500">No documents uploaded yet.</p>
                  )}
                  {isEditable && <label className="mt-1.5 flex h-[30px] cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-transparent text-[12px] text-slate-500 hover:bg-white">
                    {uploading ? 'Uploading…' : <>Drop PDFs here or <span className="ml-1 font-semibold text-rose-600">browse</span> · max 10 files, 10 MB each</>}
                    <input type="file" accept="application/pdf" className="hidden" onChange={uploadDocument} disabled={uploading} />
                  </label>}
                </ProfileSection>

                {saveMessage && <p role={saveFailed ? 'alert' : 'status'} className={`py-3 text-sm font-medium ${saveFailed ? 'text-rose-700' : 'text-slate-700'}`}>{saveMessage}</p>}
                {isEditable && (
                  <div className="flex flex-wrap justify-end gap-3 pt-5">
                    <Link to="/vendor" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</Link>
                    <Button type="submit" loading={saving}>Save profile</Button>
                    {(isDraft || isRejected) && (
                      <Button type="submit" value="submit-review" loading={saving}>
                        Submit for review
                      </Button>
                    )}
                  </div>
                )}
              </form>
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

const fieldClassName = 'h-[20px] w-full rounded border border-slate-300 bg-white px-2 py-0 text-[12px] text-slate-800 outline-none focus:border-[#d15d2d] disabled:bg-slate-50';

function ProfileSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-2 border-b border-slate-200 py-3 last:border-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div>
        <h2 className="text-[14px] font-bold leading-5 text-slate-900">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-4 text-slate-500">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-semibold leading-4 text-slate-700">
      {label}
      <span className="mt-1 block">{children}</span>
      {error && <span role="alert" className="mt-1 block text-[12px] font-normal text-rose-600">{error}</span>}
    </label>
  );
}

function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>; }
