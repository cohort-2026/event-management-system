import { useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCard, FileText, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import VendorPortalLayout from '@/components/vendor/VendorPortalLayout';
import { useAuth } from '@/context/AuthContext';
import { getMyApplications } from '@/services/vendorService';
import type { VendorApplication, VendorInvoice } from '@/types/vendor';

type InvoiceApplication = VendorApplication & { invoice: VendorInvoice };

function invoiceStatus(invoice: VendorInvoice, now: number): { label: string; tone: 'success' | 'warning' | 'danger' | 'default' } {
  if (invoice.status === 'PAID') return { label: 'Paid', tone: 'success' };
  if (invoice.status === 'VOID') return { label: 'Void', tone: 'default' };
  return new Date(invoice.dueAt).getTime() < now
    ? { label: 'Overdue', tone: 'danger' }
    : { label: 'Unpaid', tone: 'warning' };
}

export default function VendorInvoices() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<InvoiceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [selected, setSelected] = useState<InvoiceApplication | null>(null);
  const businessName = user?.firstname ? `${user.firstname} ${user.lastname ?? ''}`.trim() : 'Vendor';

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then(response => {
        if (!active) return;
        setCurrentTime(Date.now());
        setApplications(response.data.data.filter((application): application is InvoiceApplication => Boolean(application.invoice)));
      })
      .catch(loadError => {
        if (!active) return;
        setError(axios.isAxiosError<{ message?: string }>(loadError)
          ? loadError.response?.data.message ?? 'Invoice information could not be loaded.'
          : 'Invoice information could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selected]);

  return (
    <VendorPortalLayout businessName={businessName} title="Invoices & payments" subtitle="Review invoices issued for approved vendor applications.">
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Spinner /></div> : error && applications.length === 0 ? null : applications.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171823]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>{['Invoice', 'Event', 'Issued', 'Amount', 'Due date', 'Status', ''].map(column => <th key={column || 'view'} scope="col" className="px-5 py-3">{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                {applications.map(application => {
                  const invoice = application.invoice;
                  const status = currentTime === null ? { label: invoice.status, tone: 'default' as const } : invoiceStatus(invoice, currentTime);
                  return (
                    <tr key={invoice.id}>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{application.event?.title ?? 'Event'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{new Date(invoice.issuedAt).toLocaleDateString('en-ZA')}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{invoice.currency} {Number(invoice.amount).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{new Date(invoice.dueAt).toLocaleDateString('en-ZA')}</td>
                      <td className="px-5 py-4"><Badge variant={status.tone}>{status.label}</Badge></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(application)} className="whitespace-nowrap font-semibold text-violet-700 dark:text-violet-300">View invoice</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">Payment records and invoice downloads are not available in the current Vendor API. Overdue is derived from an ISSUED invoice whose due date has passed.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#171823]">
          <CreditCard size={28} className="mx-auto text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">No invoices available</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Invoices will appear here after an organizer approves an application and issues an invoice.</p>
          <FileText size={16} className="mx-auto mt-4 text-slate-400" />
        </div>
      )}
      {selected && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="invoice-details-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171823]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Vendor invoice</p><h2 id="invoice-details-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selected.invoice.invoiceNumber}</h2></div>
              <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="Close invoice details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
            </header>
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <Detail label="Event" value={selected.event?.title ?? 'Event'} />
              <Detail label="Application reference" value={selected.id} />
              <Detail label="Issued" value={new Date(selected.invoice.issuedAt).toLocaleDateString('en-ZA')} />
              <Detail label="Due" value={new Date(selected.invoice.dueAt).toLocaleDateString('en-ZA')} />
              <Detail label="Amount" value={`${selected.invoice.currency} ${Number(selected.invoice.amount).toFixed(2)}`} />
              <Detail label="Status" value={currentTime === null ? selected.invoice.status : invoiceStatus(selected.invoice, currentTime).label} />
              <p className="text-sm text-slate-500 dark:text-slate-400 sm:col-span-2">Invoice downloads and payment records are not provided by the current API.</p>
            </dl>
          </section>
        </div>
      )}
    </VendorPortalLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-100">{value}</dd></div>;
}
