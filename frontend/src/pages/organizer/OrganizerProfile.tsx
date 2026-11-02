import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import type { ApiError } from '@/types/api';
import {
  getOrganizerProfile,
  updateOrganizerProfile,
  type OrganizerProfile as OrganizerProfileData,
  type UpdateOrganizerProfileDto,
} from '@/services/organizerService';

const emptyProfile: UpdateOrganizerProfileDto = {
  firstname: '',
  lastname: '',
  organizationName: '',
  organizationDescription: '',
  phone: '',
};

const sidebarItems = [
  { label: 'Overview', to: '/organizer', icon: <span aria-hidden="true">⌂</span> },
  { label: 'Create event', to: '/organizer/events/new', icon: <span aria-hidden="true">＋</span> },
  { label: 'My profile', to: '/organizer/profile', icon: <span aria-hidden="true">◎</span> },
];

function toFormValues(profile: OrganizerProfileData): UpdateOrganizerProfileDto {
  return {
    firstname: profile.firstname,
    lastname: profile.lastname,
    organizationName: profile.organizationName ?? '',
    organizationDescription: profile.organizationDescription ?? '',
    phone: profile.phone ?? '',
  };
}

export default function OrganizerProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [email, setEmail] = useState('');
  const [profileApprovalStatus, setProfileApprovalStatus] = useState<OrganizerProfileData['profileApprovalStatus'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    getOrganizerProfile()
      .then(response => {
        if (!active) return;
        setProfile(toFormValues(response.data.data));
        setEmail(response.data.data.email);
        setProfileApprovalStatus(response.data.data.profileApprovalStatus);
      })
      .catch(error => {
        if (!active) return;
        setLoadError(axios.isAxiosError<ApiError>(error)
          ? error.response?.data.message ?? 'Your organizer profile could not be loaded.'
          : 'Your organizer profile could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateField = <K extends keyof UpdateOrganizerProfileDto>(key: K, value: UpdateOrganizerProfileDto[K]) => {
    setProfile(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key]: '' }));
    setSaveError('');
    setSaveMessage('');
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    setFieldErrors({});

    try {
      const response = await updateOrganizerProfile(profile);
      setProfile(toFormValues(response.data.data));
      setEmail(response.data.data.email);
      setProfileApprovalStatus(response.data.data.profileApprovalStatus);
      setSaveMessage(response.data.message ?? 'Organizer profile saved.');
    } catch (error) {
      if (axios.isAxiosError<ApiError>(error) && error.response?.status === 400) {
        setFieldErrors(Object.fromEntries(
          Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']),
        ));
        setSaveError(error.response.data.message ?? 'Please check the highlighted fields.');
      } else {
        setSaveError(axios.isAxiosError<ApiError>(error)
          ? error.response?.data.message ?? 'Your profile could not be saved. Please try again.'
          : 'Your profile could not be saved. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8 lg:flex-row">
        <DashboardSidebar title="Organizer" subtitle="Operations" items={sidebarItems} />
        <section className="min-w-0 flex-1">
          <DashboardHeader
            title="Organizer profile"
            subtitle="Manage the contact and organization details shown with your events."
            breadcrumbs={[{ label: 'Dashboard', to: '/organizer' }, { label: 'My profile' }]}
          />

          {profileApprovalStatus && (
            <div
              role="status"
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                profileApprovalStatus === 'APPROVED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {profileApprovalStatus === 'APPROVED'
                ? 'Your profile is approved. You can create events.'
                : 'Your profile is awaiting admin approval. Any profile changes must be reviewed before you can create events.'}
            </div>
          )}

          {loading ? (
            <p role="status" className="py-12 text-center text-sm text-neutral-500">Loading your profile…</p>
          ) : loadError ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
          ) : (
            <form onSubmit={saveProfile} className="space-y-6">
              <section aria-labelledby="organizer-account-heading" className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 id="organizer-account-heading" className="text-lg font-bold text-neutral-900">Account details</h2>
                <p className="mt-1 text-sm text-neutral-500">Your name identifies you as the person managing this organization.</p>
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="First name"
                    autoComplete="given-name"
                    maxLength={80}
                    required
                    value={profile.firstname}
                    onChange={event => updateField('firstname', event.target.value)}
                    error={fieldErrors.firstname}
                  />
                  <Input
                    label="Last name"
                    autoComplete="family-name"
                    maxLength={80}
                    required
                    value={profile.lastname}
                    onChange={event => updateField('lastname', event.target.value)}
                    error={fieldErrors.lastname}
                  />
                  <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    value={email}
                    disabled
                    helperText="This verified sign-in email cannot be changed here."
                  />
                </div>
              </section>

              <section aria-labelledby="organizer-organization-heading" className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 id="organizer-organization-heading" className="text-lg font-bold text-neutral-900">Organization details</h2>
                <p className="mt-1 text-sm text-neutral-500">These details help attendees identify and contact your organization.</p>
                <div className="mt-5 space-y-5">
                  <Input
                    label="Organization name"
                    autoComplete="organization"
                    maxLength={120}
                    required
                    value={profile.organizationName}
                    onChange={event => updateField('organizationName', event.target.value)}
                    error={fieldErrors.organizationName}
                  />
                  <Input
                    label="Phone number (optional)"
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={profile.phone}
                    onChange={event => updateField('phone', event.target.value)}
                    error={fieldErrors.phone}
                    helperText="A contact number for questions about your events."
                  />
                  <Textarea
                    label="Organization description (optional)"
                    maxLength={500}
                    value={profile.organizationDescription}
                    onChange={event => updateField('organizationDescription', event.target.value)}
                    error={fieldErrors.organizationDescription}
                    helperText="A short introduction, up to 500 characters."
                  />
                </div>
              </section>

              {saveError && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{saveError}</p>}
              {saveMessage && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saveMessage}</p>}

              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save profile</Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
