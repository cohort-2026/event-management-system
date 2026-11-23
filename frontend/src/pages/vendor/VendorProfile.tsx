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
const businessCategories = [
  'Food & Beverages',
  'Clothing & Fashion',
  'Beauty & Cosmetics',
  'Arts & Crafts',
  'Electronics & Technology',
  'Health & Wellness',
  'Home & Lifestyle',
  'Entertainment',
  'Services',
  'Other',
] as const;
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
  const [businessCategory, setBusinessCategory] = useState<string>('');
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
        setProfile({ ...data, businessType: data.businessType === 'Other' ? '' : data.businessType });
        setBusinessCategory(businessCategories.includes(data.businessType as typeof businessCategories[number])
          ? data.businessType
          : data.businessType ? 'Other' : '');
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
                <span className="vendor-profile-page-title truncate text-[12px] font-extrabold text-[#333]">Business profile</span>
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="bg-white px-4 pb-8 pt-6 sm:px-6 lg:px-8">
              {loading ? (
                <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500" role="status">Loading business profile…</div>
              ) : loadError ? (
                <p role="alert" className="text-sm font-medium text-rose-700">{loadError}</p>
              ) : (
                <>
              <div className="mx-auto mb-5 max-w-6xl border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Business profile</p>
                    <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{profile.businessName || 'Your business name'}</h1>
                    <p className="mt-1 text-sm text-slate-600">Manage your business information.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isApproved ? 'bg-emerald-50 text-emerald-700' : isPending ? 'bg-sky-50 text-sky-700' : isRejected ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                    {isApproved ? 'Approved' : isPending ? 'Under review' : isRejected ? 'Needs updates' : 'Incomplete'}
                  </span>
                </div>
              </div>
              <div className="mx-auto max-w-6xl">
              {isApproved ? (
                <div className="mb-2 flex min-h-[43px] items-center gap-2 rounded-lg border border-[#b8f1dc] bg-[#edfcf6] px-2.5 py-1.5 text-[#075f4d]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[#0b9a79]"><CheckIcon /></span>
                    <div>
                      <p className="text-[13px] font-bold leading-5">Approved vendor</p>
                      <p className="text-[12px] leading-4">
                        {profile.reviewedAt ? `Approved on ${new Date(profile.reviewedAt).toLocaleDateString()}. ` : ''}
                        You can apply for stands at any event.
                      </p>
                    </div>
                  </div>
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

              <form onSubmit={saveProfile} noValidate className="space-y-3">
                <div className="space-y-3">
                  <ProfileSection title="Business information">
                    <div className="grid gap-4">
                      <Field label="Trading name" error={fieldErrors.businessName}>
                        <input
                          required
                          disabled={!isEditable}
                          maxLength={120}
                          value={profile.businessName}
                          onChange={event => updateField('businessName', event.target.value)}
                          className={fieldClassName}
                        />
                      </Field>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Field label="Business category" error={fieldErrors.businessType}>
                        <select
                          value={businessCategory}
                          disabled={!isEditable}
                          onChange={event => {
                            const value = event.target.value;
                            setBusinessCategory(value);
                            updateField('businessType', value === 'Other' ? '' : value);
                          }}
                          className={fieldClassName}
                        >
                          <option value="">Select a category</option>
                          {businessCategories.map(category => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </Field>
                      {businessCategory === 'Other' && (
                        <Field label="Please specify your category" error={fieldErrors.businessType}>
                          <input
                            disabled={!isEditable}
                            maxLength={100}
                            value={profile.businessType}
                            onChange={event => updateField('businessType', event.target.value)}
                            placeholder="Enter your business category"
                            className={fieldClassName}
                          />
                        </Field>
                      )}
                      <Field label="Business address" error={fieldErrors.businessAddress}>
                        <input disabled={!isEditable} maxLength={500} value={profile.businessAddress} onChange={event => updateField('businessAddress', event.target.value)} className={fieldClassName} />
                      </Field>
                    </div>
                  </ProfileSection>

                  <ProfileSection title="Products & Services">
                    {isApproved ? (
                      <div className="flex flex-wrap gap-2" aria-label="Products and services">
                        {profile.productsServices.length ? profile.productsServices.map(item => <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{item}</span>) : <p className="text-sm text-slate-500">No products or services added.</p>}
                      </div>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-slate-600" htmlFor="product-service-input">Add the products or services your business provides.</label>
                        <div className="mt-2 flex gap-2">
                          <input id="product-service-input" value={serviceDraft} onChange={event => { setServiceDraft(event.target.value); setServiceError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addProductOrService(); } }} placeholder="Enter a product or service" className={fieldClassName} />
                          <button type="button" onClick={addProductOrService} className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Add</button>
                        </div>
                        {serviceError && <p role="alert" className="mt-2 text-xs text-rose-700">{serviceError}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {profile.productsServices.map(item => (
                            <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800">
                              {item}
                              <button type="button" onClick={() => removeProductOrService(item)} aria-label={`Remove ${item}`} className="rounded-full text-rose-500 hover:text-rose-900">×</button>
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </ProfileSection>

                  <ProfileSection title="Tax & Registration">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="CIPC registration number" error={fieldErrors.businessRegistrationNumber}>
                        <input
                          disabled={!isEditable}
                          maxLength={100}
                          value={profile.businessRegistrationNumber}
                          onChange={event => updateField('businessRegistrationNumber', event.target.value)}
                          placeholder="2020/123456/07"
                          className={fieldClassName}
                        />
                      </Field>
                    </div>
                  
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Business documents</h3>
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
                            <button type="button" onClick={() => viewDocument(document)} className="min-h-9 rounded border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">View</button>
                            {isEditable && (
                              <button type="button" onClick={() => removeDocument(document)} className="min-h-9 rounded border border-rose-200 bg-white px-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Remove</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded border border-dashed border-slate-300 bg-white px-2 py-3 text-center text-[12px] text-slate-500">No documents uploaded yet.</p>
                  )}
                  {isEditable && <label className="mt-1.5 flex min-h-10 cursor-pointer flex-wrap items-center justify-center rounded-md border border-dashed border-slate-300 bg-transparent px-2 py-2 text-center text-[12px] text-slate-500 hover:bg-white">
                    {uploading ? 'Uploading…' : <>Drop PDFs here or <span className="ml-1 font-semibold text-rose-600">browse</span> · max 10 files, 10 MB each</>}
                    <input type="file" accept="application/pdf" className="hidden" onChange={uploadDocument} disabled={uploading} />
                  </label>}
                  </ProfileSection>

                  {!isApproved && <ProfileSection title="Contact information">
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
                            className="h-10 max-w-[46%] rounded border border-slate-300 bg-white px-2 py-0 text-[12px] text-slate-800 focus:border-[#d15d2d] focus:outline-none"
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
                </div>

                

                {isEditable && (
                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <Link to="/vendor" className="vendor-button rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</Link>
                    <Button type="submit" loading={saving}>Save profile</Button>
                    {(isDraft || isRejected) && <Button type="submit" value="submit-review" loading={saving}>Submit for review</Button>}
                  </div>
                )}

                {saveMessage && <p role={saveFailed ? 'alert' : 'status'} className={`py-3 text-sm font-medium ${saveFailed ? 'text-rose-700' : 'text-slate-700'}`}>{saveMessage}</p>}
              </form>
              </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

const fieldClassName = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-0 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50';

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="profile-section-title text-base font-extrabold leading-6 text-slate-900">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold leading-5 text-slate-700">
      {label}
      <span className="mt-1 block">{children}</span>
      {error && <span role="alert" className="mt-1 block text-[12px] font-normal text-rose-600">{error}</span>}
    </label>
  );
}

function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>; }
