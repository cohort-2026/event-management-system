import { useEffect, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import {
  deleteVendorDocument,
  downloadVendorDocument,
  getVendorDocuments,
  getVendorProfile,
  updateVendorProfile,
  uploadVendorDocument,
} from '@/services/vendorService';
import type { ApiError } from '@/types/api';
import type { UpdateVendorProfileDto, VendorDocument } from '@/types/vendor';

const emptyProfile: UpdateVendorProfileDto = {
  businessName: '',
  businessDescription: '',
  businessRegistrationNumber: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  productsServices: [],
  supportingDocumentUrls: [],
};

const sidebarItems = [
  { label: 'Overview', to: '/vendor', icon: <DocumentIcon /> },
  { label: 'Business profile', to: '/vendor/profile', icon: <ProfileIcon /> },
  { label: 'Apply for a stand', to: '/events', icon: <PlusIcon /> },
  { label: 'My applications', to: '/vendor/applications', icon: <DocumentIcon /> },
  { label: 'Staff management', to: '/vendor/staff', icon: <UsersIcon /> },
];

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<UpdateVendorProfileDto>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serviceDraft, setServiceDraft] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentMessage, setDocumentMessage] = useState('');
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    getVendorProfile()
      .then(response => setProfile(response.data.data))
      .catch(() => setLoadError('Unable to load your business profile. Please try again.'))
      .finally(() => setLoading(false));

    getVendorDocuments()
      .then(response => setDocuments(response.data.data))
      .catch(() => setDocumentError('Unable to load your uploaded documents.'));
  }, []);

  const updateField = <K extends keyof UpdateVendorProfileDto>(key: K, value: UpdateVendorProfileDto[K]) => {
    setProfile(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key]: '' }));
    setSaveMessage('');
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
    setServiceError('');
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
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
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

  const downloadDocument = async (uploadedDocument: VendorDocument) => {
    setDocumentError('');
    try {
      const response = await downloadVendorDocument(uploadedDocument.id);
      const downloadUrl = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = uploadedDocument.originalName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      setDocumentError('Unable to download this PDF. Please try again.');
    }
  };

  const removeDocument = async (uploadedDocument: VendorDocument) => {
    if (!window.confirm(`Remove ${uploadedDocument.originalName}?`)) return;
    setDocumentError('');
    setDocumentMessage('');
    try {
      await deleteVendorDocument(uploadedDocument.id);
      setDocuments(current => current.filter(item => item.id !== uploadedDocument.id));
      setDocumentMessage('PDF removed.');
    } catch {
      setDocumentError('Unable to remove this PDF. Please try again.');
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveMessage('');
    setFieldErrors({});

    try {
      const response = await updateVendorProfile(profile);
      setProfile(response.data.data);
      setSaveMessage('Business profile saved.');
    } catch (error) {
      if (axios.isAxiosError<ApiError>(error) && error.response?.status === 400) {
        setFieldErrors(Object.fromEntries(
          Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']),
        ));
        setSaveMessage(error.response.data.message ?? 'Please check the highlighted fields.');
      } else {
        setSaveMessage('Unable to save your profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-24" role="status">Loading business profile…</div>
      </PageWrapper>
    );
  }

  if (loadError) {
    return (
      <PageWrapper>
        <p role="alert" className="text-sm font-medium text-rose-700">{loadError}</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8 lg:flex-row">
        <DashboardSidebar title="Vendor" subtitle="Operations" items={sidebarItems} />
        <section className="min-w-0 flex-1">
          <DashboardHeader
            title="Business profile"
            subtitle="Manage the details used on your vendor applications"
            breadcrumbs={[{ label: 'Dashboard', to: '/vendor' }, { label: 'Business profile' }]}
          />

          <form onSubmit={saveProfile} className="space-y-6">
            <section aria-labelledby="business-details-heading" className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 id="business-details-heading" className="text-lg font-bold text-neutral-900">Business details</h2>
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input label="Business or trading name" value={profile.businessName} onChange={event => updateField('businessName', event.target.value)} required maxLength={120} error={fieldErrors.businessName} />
                <Input label="Business registration number" value={profile.businessRegistrationNumber} onChange={event => updateField('businessRegistrationNumber', event.target.value)} maxLength={100} error={fieldErrors.businessRegistrationNumber} />
                <div className="md:col-span-2">
                  <Textarea label="Business description" value={profile.businessDescription} onChange={event => updateField('businessDescription', event.target.value)} maxLength={2000} helperText={`${profile.businessDescription.length}/2000 characters`} error={fieldErrors.businessDescription} />
                </div>
                <div className="md:col-span-2" role="group" aria-labelledby="products-services-heading">
                  <h3 id="products-services-heading" className="mb-1.5 text-sm font-medium text-neutral-700">Products or services offered</h3>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Input
                        label="Add a product or service"
                        value={serviceDraft}
                        onChange={event => { setServiceDraft(event.target.value); setServiceError(''); }}
                        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addProductOrService(); } }}
                        maxLength={100}
                        placeholder="e.g. Catering, photography, floral design"
                        error={serviceError || fieldErrors.productsServices}
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={addProductOrService} disabled={!serviceDraft.trim()}>Add item</Button>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">Add up to 20 products or services ({profile.productsServices.length}/20).</p>
                  {profile.productsServices.length > 0 && (
                    <ul aria-label="Added products and services" aria-live="polite" className="mt-3 flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                      {profile.productsServices.map(item => (
                        <li key={item} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm text-neutral-800">
                          <span className="break-words">{item}</span>
                          <button type="button" onClick={() => removeProductOrService(item)} aria-label={`Remove ${item}`} title={`Remove ${item}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Input label="Contact person" value={profile.contactPerson} onChange={event => updateField('contactPerson', event.target.value)} required maxLength={120} error={fieldErrors.contactPerson} />
              </div>
            </section>

            <section aria-labelledby="contact-details-heading" className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 id="contact-details-heading" className="text-lg font-bold text-neutral-900">Contact details</h2>
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input label="Business email address" type="email" value={profile.contactEmail} onChange={event => updateField('contactEmail', event.target.value)} required maxLength={254} error={fieldErrors.contactEmail} />
                <Input label="Business phone number" type="tel" value={profile.contactPhone} onChange={event => updateField('contactPhone', event.target.value)} required maxLength={30} error={fieldErrors.contactPhone} />
              </div>
            </section>

            <section aria-labelledby="documents-heading" className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 id="documents-heading" className="text-lg font-bold text-neutral-900">Supporting documents</h2>
              <p className="mt-2 text-sm text-neutral-600">Upload PDF files only, up to 10 MB each. You can store up to 10 documents.</p>
              <div className="mt-5 max-w-xl">
                <Input id="vendor-document-upload" label="Upload a PDF document" type="file" accept=".pdf,application/pdf" onChange={uploadDocument} disabled={uploading || documents.length >= 10} helperText={`${documents.length}/10 documents · Files are private to your vendor account.`} />
              </div>
              {uploading && <p role="status" className="mt-3 text-sm text-neutral-600">Uploading PDF…</p>}
              {documentError && <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{documentError}</p>}
              {documentMessage && <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{documentMessage}</p>}
              {documents.length > 0 && (
                <ul aria-label="Uploaded supporting documents" className="mt-5 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                  {documents.map(document => (
                    <li key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-neutral-900">{document.originalName}</p>
                        <p className="mt-1 text-xs text-neutral-500">{formatFileSize(document.sizeBytes)} · Uploaded {new Date(document.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => downloadDocument(document)}>Download</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeDocument(document)} aria-label={`Remove ${document.originalName}`}>Remove</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" loading={saving}>Save business profile</Button>
              {saveMessage && <p role={Object.values(fieldErrors).some(Boolean) ? 'alert' : 'status'} className={`text-sm font-medium ${Object.values(fieldErrors).some(Boolean) ? 'text-rose-700' : 'text-emerald-700'}`}>{saveMessage}</p>}
            </div>
          </form>
        </section>
      </div>
    </PageWrapper>
  );
}

function formatFileSize(sizeBytes: number): string {
  return sizeBytes < 1024 * 1024
    ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
    : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}

function ProfileIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12a4 4 0 100-8 4 4 0 000 8zm7 9a7 7 0 00-14 0" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
}

function UsersIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M10 11a4 4 0 100-8 4 4 0 000 8zm7-7.87a4 4 0 010 7.75" /></svg>;
}