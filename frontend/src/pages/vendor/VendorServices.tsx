import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Package, Plus, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getVendorProfile } from '@/services/vendorService';
import type { VendorProfile } from '@/types/vendor';

export default function VendorServices() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  useEffect(() => {
    let active = true;
    getVendorProfile()
      .then(response => { if (active) setProfile(response.data.data); })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Business services could not be loaded.'
          : 'Business services could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <VendorPortalLayout businessName={businessName} title="Services & packages" subtitle="Manage the products and services included in your business profile.">
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && !profile ? null : (
        <div className="space-y-5">
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823] sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><Store size={20} /></span>
              <div><h2 className="font-semibold text-slate-900 dark:text-white">{profile?.businessName || businessName}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Services offered in your vendor profile</p></div>
            </div>
            <Link to="/vendor/profile#services" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Plus size={16} /> Edit services</Link>
          </section>
          {profile?.productsServices.length ? (
            <section aria-label="Services offered" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {profile.productsServices.map(service => (
                <article key={service} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171823]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"><Package size={18} /></span>
                  <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{service}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Included in your business profile</p>
                </article>
              ))}
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-[#171823]">
              <Package size={28} className="mx-auto text-slate-400" />
              <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No services listed</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Add products or services to your business profile so event organizers can see what you offer.</p>
              <Link to="/vendor/profile#services" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 dark:text-violet-300">Update business profile <ArrowUpRight size={15} /></Link>
            </div>
          )}
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            The current API stores a list of service names only. Separate service categories, images, packages, pricing, availability, and service-level add/edit/deactivate operations are not supported.
          </p>
        </div>
      )}
    </VendorPortalLayout>
  );
}
