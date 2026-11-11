import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BriefcaseBusiness, CheckCircle2, Clock3, FileText, Package, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyApplications, getVendorProfile } from '@/services/vendorService';
import type { VendorApplication, VendorProfile } from '@/types/vendor';

export default function VendorAnalytics() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  useEffect(() => {
    let active = true;
    Promise.allSettled([getMyApplications(), getVendorProfile()])
      .then(([applicationResult, profileResult]) => {
        if (!active) return;
        const failures: string[] = [];
        if (applicationResult.status === 'fulfilled') {
          setApplications(applicationResult.value.data.data);
          setApplicationsLoaded(true);
        }
        else failures.push(axios.isAxiosError<{ message?: string }>(applicationResult.reason)
          ? applicationResult.reason.response?.data.message ?? 'Application statistics could not be loaded.'
          : 'Application statistics could not be loaded.');
        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value.data.data);
          setProfileLoaded(true);
        }
        else failures.push(axios.isAxiosError<{ message?: string }>(profileResult.reason)
          ? profileResult.reason.response?.data.message ?? 'Service statistics could not be loaded.'
          : 'Service statistics could not be loaded.');
        setCurrentTime(Date.now());
        setErrors(failures);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const approved = applications.filter(application => application.status === 'APPROVED');
  const pending = applications.filter(application => application.status === 'PENDING_REVIEW');
  const rejected = applications.filter(application => application.status === 'REJECTED');
  const upcoming = currentTime === null ? [] : approved.filter(application =>
    Number.isFinite(new Date(application.event?.date ?? '').getTime())
    && new Date(application.event?.date ?? '').getTime() >= currentTime);
  const chartData = useMemo(() => [
    { status: 'Approved', applications: approved.length },
    { status: 'Pending', applications: pending.length },
    { status: 'Rejected', applications: rejected.length },
  ], [approved.length, pending.length, rejected.length]);

  const metrics = [
    { label: 'Total applications', value: applicationsLoaded ? applications.length : '—', icon: FileText, tone: 'violet' },
    { label: 'Approved', value: applicationsLoaded ? approved.length : '—', icon: CheckCircle2, tone: 'green' },
    { label: 'Pending', value: applicationsLoaded ? pending.length : '—', icon: Clock3, tone: 'amber' },
    { label: 'Rejected', value: applicationsLoaded ? rejected.length : '—', icon: XCircle, tone: 'rose' },
    { label: 'Upcoming participation', value: applicationsLoaded && currentTime !== null ? upcoming.length : '—', icon: BriefcaseBusiness, tone: 'blue' },
    { label: 'Services listed', value: profileLoaded ? profile?.productsServices.length ?? 0 : '—', icon: Package, tone: 'indigo' },
  ] as const;

  return (
    <VendorPortalLayout businessName={businessName} title="Performance & analytics" subtitle="An overview of your applications, approved participation, and listed services.">
      {errors.length > 0 && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{errors.map(error => <p key={error}>{error}</p>)}</div>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <div className="space-y-6">
          <section aria-label="Vendor performance statistics" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {metrics.map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823]">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300' : tone === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300' : tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300' : tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300' : tone === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300'}`}><Icon size={19} /></span></div>
              </article>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-3">
              <h2 className="font-bold text-slate-900 dark:text-white">Application status</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Counts from your current applications</p>
              {applicationsLoaded ? <div className="mt-5 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }} />
                    <Bar dataKey="applications" name="Applications" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div> : <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Application status chart unavailable because the application data could not be loaded.</p>}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] xl:col-span-2">
              <h2 className="font-bold text-slate-900 dark:text-white">Participation history</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your approved event applications</p>
              {!applicationsLoaded ? <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Participation history unavailable because the application data could not be loaded.</p> : approved.length ? (
                <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/[0.07]">
                  {approved.slice(0, 6).map(application => (
                    <li key={application.id} className="py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{application.event?.title ?? 'Event'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{application.event?.date ? new Date(application.event.date).toLocaleDateString('en-ZA') : 'Date unavailable'} · {application.requestedStandType}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No approved participation yet.</p>}
              <Link to="/vendor/my-events" className="mt-4 inline-flex text-sm font-semibold text-violet-700 dark:text-violet-300">View approved events →</Link>
            </article>
          </section>
          <p className="text-xs text-slate-500 dark:text-slate-400">These are current record counts, not historical trends. Revenue, payment history, and period-over-period comparisons are not available through the current Vendor API.</p>
        </div>
      )}
    </VendorPortalLayout>
  );
}
