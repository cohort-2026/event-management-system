import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import OrganizerEventSearch from '@/components/layout/OrganizerEventSearch';
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
  const [organizationDescription, setOrganizationDescription] = useState('');
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
  const [isRequestingChange, setIsRequestingChange] = useState(false);
  const savedProfile = useRef('');
  const isApproved = profileApprovalStatus === 'APPROVED';
  const canEdit = !isApproved || isRequestingChange;

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
        savedProfile.current = JSON.stringify({ profile: toFormValues(response.data.data), ...splitPhoneNumber(response.data.data.phone) });
        setPhoneFromProfile(response.data.data.phone);
        setEmail(response.data.data.email);
        setOrganizationDescription(response.data.data.organizationDescription ?? '');
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
    if (isApproved && !isRequestingChange) return;
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
      savedProfile.current = JSON.stringify({ profile: toFormValues(response.data.data), ...splitPhoneNumber(response.data.data.phone) });
      setPhoneFromProfile(response.data.data.phone);
      setEmail(response.data.data.email);
      setOrganizationDescription(response.data.data.organizationDescription ?? '');
      setProfileApprovalStatus(response.data.data.profileApprovalStatus);
      setProfileRejectionReason(response.data.data.profileRejectionReason);
      setIsRequestingChange(false);
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

  const confirmLeave = () => (
    !savedProfile.current ||
    savedProfile.current === JSON.stringify({ profile, countryCode: phoneCountryCode, number: phoneNumber }) ||
    window.confirm('Leave this page? Unsaved profile changes will be lost.')
  );

  return (
    <PageWrapper appearance="light">
      <div className="flex flex-col gap-6 lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 rounded-2xl bg-[#0b2440] p-4 sm:p-6">
          <DashboardHeader
            title="Organization profile"
            subtitle="Manage the organization details used when your events are reviewed."
            showNavigation={false}
            confirmNotificationNavigation={confirmLeave}
            notificationsDisabled={saving}
            actions={<OrganizerEventSearch confirmSearch={confirmLeave} disabled={saving} />}
          />

          {profileApprovalStatus && (
            <div
              role="status"
              className={`mb-6 flex flex-col gap-3 rounded-xl border px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between ${
                profileApprovalStatus === 'APPROVED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : profileApprovalStatus === 'REJECTED'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <div>
                <p className="font-semibold">
                  {profileApprovalStatus === 'APPROVED'
                    ? 'Your organization is approved'
                    : profileApprovalStatus === 'REJECTED'
                      ? 'Your organization needs an update'
                      : 'Your organization is awaiting approval'}
                </p>
                <p className="mt-1">
                  {profileApprovalStatus === 'APPROVED'
                    ? 'You can submit events for approval.'
                    : profileApprovalStatus === 'REJECTED'
                      ? 'Review the feedback below and update your details to resubmit.'
                      : 'Profile changes will be reviewed before you can submit events.'}
                </p>
              </div>
              {isApproved && !isRequestingChange && (
                <Button type="button" variant="secondary" onClick={() => setIsRequestingChange(true)}>
                  Request a change
                </Button>
              )}
            </div>
          )}
          {profileApprovalStatus === 'REJECTED' && profileRejectionReason && (
            <section aria-labelledby="profile-rejection-feedback" className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <h2 id="profile-rejection-feedback" className="text-sm font-semibold text-rose-900">Admin feedback</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-rose-800">{profileRejectionReason}</p>
            </section>
          )}
          {isApproved && isRequestingChange && (
            <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Saving changed details sends your profile back for approval.
            </p>
          )}

          {loading ? (
            <p role="status" className="py-12 text-center text-sm text-slate-200">Loading your profile…</p>
          ) : loadError ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
          ) : (
            <form onSubmit={saveProfile} className="organizer-profile-card rounded-xl border border-[#5c2634] bg-[radial-gradient(ellipse_at_68%_18%,#8d102d_0%,#3b0b16_32%,#0b090c_70%)] p-5 shadow-sm sm:p-6">
              <section aria-labelledby="organization-heading" className="grid gap-5 border-b border-neutral-200 pb-6 lg:grid-cols-[minmax(150px,0.55fr)_minmax(0,1.45fr)] lg:gap-8">
                <div>
                  <h2 id="organization-heading" className="text-base font-bold text-neutral-900">Organization</h2>
                  <p className="mt-1 text-sm text-neutral-500">Shown to administrators when they review your events.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Input
                      label="Organization name"
                      autoComplete="organization"
                      maxLength={120}
                      required
                      value={profile.organizationName}
                      onChange={event => updateField('organizationName', event.target.value)}
                      error={fieldErrors.organizationName}
                      disabled={!canEdit}
                    />
                  </div>
                  <Input
                    label="Registration number"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{9}"
                    maxLength={9}
                    required
                    value={profile.organizationRegistrationNumber}
                    onChange={event => updateField('organizationRegistrationNumber', event.target.value)}
                    error={fieldErrors.organizationRegistrationNumber}
                    helperText="Enter exactly 9 digits."
                    disabled={!canEdit}
                  />
                </div>
              </section>

              <section aria-labelledby="contact-heading" className="grid gap-5 border-b border-neutral-200 py-6 lg:grid-cols-[minmax(150px,0.55fr)_minmax(0,1.45fr)] lg:gap-8">
                <div>
                  <h2 id="contact-heading" className="text-base font-bold text-neutral-900">Contact</h2>
                  <p className="mt-1 text-sm text-neutral-500">Administrators can use these details if they need to check something.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="First name"
                    autoComplete="given-name"
                    maxLength={80}
                    required
                    value={profile.firstname}
                    onChange={event => updateField('firstname', event.target.value)}
                    error={fieldErrors.firstname}
                    disabled={!canEdit}
                  />
                  <Input
                    label="Last name"
                    autoComplete="family-name"
                    maxLength={80}
                    required
                    value={profile.lastname}
                    onChange={event => updateField('lastname', event.target.value)}
                    error={fieldErrors.lastname}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                  />
                  <Input
                    label="Account email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    disabled
                    helperText="This sign-in email cannot be changed here."
                  />
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label htmlFor="organizer-phone-number" className="text-sm font-medium text-neutral-700">
                      Phone number
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        id="organizer-phone-country-code"
                        aria-label="Phone country calling code"
                        value={phoneCountryCode}
                        onChange={event => setPhoneCountryCode(event.target.value)}
                        disabled={!canEdit}
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
                        disabled={!canEdit}
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

              <section aria-labelledby="public-profile-heading" className="grid gap-5 py-6 lg:grid-cols-[minmax(150px,0.55fr)_minmax(0,1.45fr)] lg:gap-8">
                <div>
                  <h2 id="public-profile-heading" className="text-base font-bold text-neutral-900">Public profile</h2>
                  <p className="mt-1 text-sm text-neutral-500">Your organization description.</p>
                </div>
                <div className="flex items-start gap-4">
                  <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-sm font-bold text-white">
                    {profile.organizationName.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'OR'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-sm font-medium text-neutral-700">Organization description</p>
                    <p className="min-h-12 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-700">
                      {organizationDescription || 'No public description is available.'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">This description cannot be edited here.</p>
                  </div>
                </div>
              </section>

              {saveError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{saveError}</p>}
              {saveMessage && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saveMessage}</p>}

              {canEdit && (
                <div className="flex justify-end">
                  <Button type="submit" loading={saving}>
                    {isApproved && isRequestingChange ? 'Submit changes for review' : 'Save profile'}
                  </Button>
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
