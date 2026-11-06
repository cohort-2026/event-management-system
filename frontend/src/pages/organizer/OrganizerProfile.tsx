import { useEffect, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
  organizationEmail: '',
  organizationRegistrationNumber: '',
  phone: '',
};

const phoneCountryCodes = [
  { country: 'South Africa', code: '+27' },
  { country: 'United States', code: '+1' },
  { country: 'Canada', code: '+1' },
  { country: 'United Kingdom', code: '+44' },
  { country: 'Ireland', code: '+353' },
  { country: 'Australia', code: '+61' },
  { country: 'New Zealand', code: '+64' },
  { country: 'India', code: '+91' },
  { country: 'China', code: '+86' },
  { country: 'Japan', code: '+81' },
  { country: 'United Arab Emirates', code: '+971' },
  { country: 'Saudi Arabia', code: '+966' },
  { country: 'Nigeria', code: '+234' },
  { country: 'Kenya', code: '+254' },
  { country: 'Ghana', code: '+233' },
  { country: 'Zimbabwe', code: '+263' },
  { country: 'Botswana', code: '+267' },
  { country: 'Namibia', code: '+264' },
  { country: 'Lesotho', code: '+266' },
  { country: 'Eswatini', code: '+268' },
  { country: 'Mozambique', code: '+258' },
  { country: 'Zambia', code: '+260' },
  { country: 'Tanzania', code: '+255' },
  { country: 'Uganda', code: '+256' },
  { country: 'Egypt', code: '+20' },
  { country: 'France', code: '+33' },
  { country: 'Germany', code: '+49' },
  { country: 'Italy', code: '+39' },
  { country: 'Spain', code: '+34' },
  { country: 'Netherlands', code: '+31' },
  { country: 'Brazil', code: '+55' },
  { country: 'Mexico', code: '+52' },
  { country: 'Singapore', code: '+65' },
  { country: 'Pakistan', code: '+92' },
  { country: 'Philippines', code: '+63' },
  { country: 'South Korea', code: '+82' },
  { country: 'Turkey', code: '+90' },
].sort((a, b) => a.country.localeCompare(b.country));

const sidebarItems = [
  { label: 'Overview', to: '/organizer', icon: <span aria-hidden="true">⌂</span> },
  { label: 'My events', to: '/organizer/events', icon: <span aria-hidden="true">▦</span> },
  { label: 'Create event', to: '/organizer/events/new', icon: <span aria-hidden="true">＋</span> },
  { label: 'My profile', to: '/organizer/profile', icon: <span aria-hidden="true">◎</span> },
];

function toFormValues(profile: OrganizerProfileData): UpdateOrganizerProfileDto {
  return {
    firstname: profile.firstname,
    lastname: profile.lastname,
    organizationName: profile.organizationName ?? '',
    organizationEmail: profile.organizationEmail ?? '',
    organizationRegistrationNumber: profile.organizationRegistrationNumber ?? '',
    phone: profile.phone ?? '',
  };
}

function splitPhoneNumber(phone: string | null) {
  const value = phone?.trim() ?? '';
  const country = [...phoneCountryCodes]
    .sort((a, b) => b.code.length - a.code.length)
    .find(option => value.startsWith(option.code));

  return country
    ? { countryCode: country.code, number: value.slice(country.code.length).trim() }
    : { countryCode: '+27', number: value };
}

export default function OrganizerProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [email, setEmail] = useState('');
  const [profileApprovalStatus, setProfileApprovalStatus] = useState<OrganizerProfileData['profileApprovalStatus'] | null>(null);
  const [profileRejectionReason, setProfileRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [phoneCountryCode, setPhoneCountryCode] = useState('+27');
  const [phoneNumber, setPhoneNumber] = useState('');

  const setPhoneFromProfile = (phone: string | null) => {
    const parsedPhone = splitPhoneNumber(phone);
    setPhoneCountryCode(parsedPhone.countryCode);
    setPhoneNumber(parsedPhone.number);
  };

  useEffect(() => {
    let active = true;
    getOrganizerProfile()
      .then(response => {
        if (!active) return;
        setProfile(toFormValues(response.data.data));
        setPhoneFromProfile(response.data.data.phone);
        setEmail(response.data.data.email);
        setProfileApprovalStatus(response.data.data.profileApprovalStatus);
        setProfileRejectionReason(response.data.data.profileRejectionReason);
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
      const localNumber = phoneNumber.trim().replace(/^0+/, '');
      const response = await updateOrganizerProfile({
        ...profile,
        organizationEmail: profile.organizationEmail.trim().toLowerCase(),
        phone: localNumber ? `${phoneCountryCode} ${localNumber}` : '',
      });
      setProfile(toFormValues(response.data.data));
      setPhoneFromProfile(response.data.data.phone);
      setEmail(response.data.data.email);
      setProfileApprovalStatus(response.data.data.profileApprovalStatus);
      setProfileRejectionReason(response.data.data.profileRejectionReason);
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
                : profileApprovalStatus === 'REJECTED'
                  ? 'Your profile was rejected. Review the feedback below and update your details to resubmit it for approval.'
                  : 'Your profile is awaiting admin approval. Any profile changes must be reviewed before you can create events.'}
            </div>
          )}
          {profileApprovalStatus === 'REJECTED' && profileRejectionReason && (
            <section aria-labelledby="profile-rejection-feedback" className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <h2 id="profile-rejection-feedback" className="text-sm font-semibold text-rose-900">Admin feedback</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-rose-800">{profileRejectionReason}</p>
            </section>
          )}

          {loading ? (
            <p role="status" className="py-12 text-center text-sm text-neutral-500">Loading your profile…</p>
          ) : loadError ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
          ) : (
            <form onSubmit={saveProfile} className="space-y-6">
              <section aria-labelledby="organizer-profile-heading" className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 id="organizer-profile-heading" className="text-lg font-bold text-neutral-900">Profile details</h2>
                <p className="mt-1 text-sm text-neutral-500">Manage your personal information and organization contact details.</p>
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

                <div className="mt-8 border-t border-neutral-100 pt-6">
                  <h3 className="text-base font-bold text-neutral-900">Organization information</h3>
                  <p className="mt-1 text-sm text-neutral-500">These details help attendees identify and contact your organization.</p>
                </div>
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
                    label="Organization email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={profile.organizationEmail}
                    onChange={event => updateField('organizationEmail', event.target.value)}
                    error={fieldErrors.organizationEmail}
                  />
                  <Input
                    label="Organization registration number"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{9}"
                    maxLength={9}
                    required
                    value={profile.organizationRegistrationNumber}
                    onChange={event => updateField('organizationRegistrationNumber', event.target.value)}
                    error={fieldErrors.organizationRegistrationNumber}
                    helperText="Enter exactly 9 digits."
                  />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="organizer-phone-number" className="text-sm font-medium text-neutral-700">
                      Phone number
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        id="organizer-phone-country-code"
                        aria-label="Phone country calling code"
                        value={phoneCountryCode}
                        onChange={event => setPhoneCountryCode(event.target.value)}
                        className="block w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-xs transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:w-56"
                      >
                        {phoneCountryCodes.map(option => (
                          <option key={`${option.country}-${option.code}`} value={option.code}>
                            {option.country} ({option.code})
                          </option>
                        ))}
                      </select>
                      <input
                        id="organizer-phone-number"
                        type="tel"
                        autoComplete="tel-national"
                        inputMode="tel"
                        maxLength={30}
                        required
                        value={phoneNumber}
                        onChange={event => {
                          setPhoneNumber(event.target.value);
                          setFieldErrors(current => ({ ...current, phone: '' }));
                          setSaveError('');
                          setSaveMessage('');
                        }}
                        aria-invalid={Boolean(fieldErrors.phone)}
                        aria-describedby={fieldErrors.phone ? 'organizer-phone-error' : 'organizer-phone-helper'}
                        className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-xs transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                          fieldErrors.phone ? 'border-rose-400' : 'border-neutral-200'
                        }`}
                      />
                    </div>
                    {fieldErrors.phone
                      ? <p id="organizer-phone-error" className="text-xs font-medium text-rose-600">{fieldErrors.phone}</p>
                      : <p id="organizer-phone-helper" className="text-xs text-neutral-400">Choose a country code and enter your phone number.</p>}
                  </div>
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
