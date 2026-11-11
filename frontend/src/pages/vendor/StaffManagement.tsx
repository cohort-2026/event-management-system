import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyStaffMembers } from '@/services/vendorService';
import type { VendorStaffWithEvent } from '@/types/vendor';

export default function StaffManagement() {
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState<VendorStaffWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  useEffect(() => {
    let active = true;
    getMyStaffMembers()
      .then(response => { if (active) setStaffMembers(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Staff members could not be loaded.'
          : 'Staff members could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <VendorPortalLayout businessName={businessName} title="Staff management" subtitle="Staff members listed on your approved event applications.">
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          The current API supports viewing staff on approved applications and adding staff while submitting a new application. Adding staff to an existing application, editing, removing, deactivating, phone numbers, staff roles, and status management are not available.
        </div>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && staffMembers.length === 0 ? null : staffMembers.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>{['Staff member', 'Email', 'Approved event', 'Event date', 'Entry pass'].map(column => <th key={column} scope="col" className="px-5 py-3">{column}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                  {staffMembers.map(member => (
                    <tr key={member.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{member.name}</td>
                      <td className="px-5 py-4"><a href={`mailto:${member.email}`} className="break-all text-violet-700 dark:text-violet-300">{member.email}</a></td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{member.application.event.title}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{new Date(member.application.event.date).toLocaleDateString('en-ZA')}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{member.entryPassId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#171823]">
            <Users size={28} className="mx-auto text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No staff members listed</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Staff included in approved stand applications will appear here.</p>
            <Link to="/vendor/applications" className="mt-4 inline-flex text-sm font-semibold text-violet-700 dark:text-violet-300">View applications →</Link>
          </div>
        )}
      </div>
    </VendorPortalLayout>
  );
}
