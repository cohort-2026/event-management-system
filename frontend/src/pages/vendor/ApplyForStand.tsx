import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import DashboardSidebar, { DashboardHeader } from '@/components/layout/DashboardSidebar';
import Button from '@/components/ui/Button';
import { applyForStand, getVendorProfile } from '@/services/vendorService';
import type { VendorProfile } from '@/types/vendor';

const sidebarItems = [
  { label: 'Overview', to: '/vendor', icon: <DocumentIcon /> },
  { label: 'Business profile', to: '/vendor/profile', icon: <ProfileIcon /> },
  { label: 'Browse events', to: '/vendor/events', icon: <PlusIcon /> },
  { label: 'My applications', to: '/vendor/applications', icon: <DocumentIcon /> },
  { label: 'Staff management', to: '/vendor/staff', icon: <UsersIcon /> },
];

export default function ApplyForStand() {
  const { id: eventId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getVendorProfile()
      .then(response => setProfile(response.data.data))
      .catch(() => setError('Unable to load your business profile.'))
      .finally(() => setLoading(false));
  }, []);

  const submitApplication = async () => {
    if (!eventId) {
      setError('This event could not be found.');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await applyForStand({ eventId });
      setMessage('Your stand application has been submitted.');
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
    <PageWrapper>
      <div className="flex flex-col gap-8 lg:flex-row">
        <DashboardSidebar title="Vendor" subtitle="Operations" items={sidebarItems} />
        <section className="min-w-0 flex-1">
          <DashboardHeader title="Apply for a stand" subtitle="Your saved business details will be included with this application" breadcrumbs={[{ label: 'Dashboard', to: '/vendor' }, { label: 'Apply for a stand' }]} />

          {loading ? (
            <p role="status" className="py-10 text-center text-neutral-500">Loading your business profile…</p>
          ) : !profile?.businessName ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-bold text-neutral-900">Complete your business profile first</h2>
              <p className="mt-2 text-sm text-neutral-700">Your business name is required and your saved details are used to prepare stand applications.</p>
              <Link to="/vendor/profile" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-900">Open business profile</Link>
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
              {error && <p role="alert" className="mt-5 text-sm font-medium text-rose-700">{error}</p>}
              {message && <p role="status" className="mt-5 text-sm font-medium text-emerald-700">{message} <Link to="/vendor/applications" className="underline">View my applications</Link></p>}
              <Button type="button" className="mt-6" loading={submitting} disabled={Boolean(message)} onClick={submitApplication}>Submit stand application</Button>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
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
