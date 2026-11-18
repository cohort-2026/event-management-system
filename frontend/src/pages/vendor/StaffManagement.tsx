import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar from '@/components/layout/VendorSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { getMyApplications, getMyStaffMembers } from '@/services/vendorService';
import type { VendorApplication, VendorStaffWithEvent } from '@/types/vendor';

export default function StaffManagement() {
  const { id: routeApplicationId } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [staffMembers, setStaffMembers] = useState<VendorStaffWithEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getMyApplications(), getMyStaffMembers()])
      .then(([applicationsResponse, staffResponse]) => {
        if (!active) return;
        setApplications(applicationsResponse.data.data);
        setStaffMembers(staffResponse.data.data);
      })
      .catch(() => {
        if (active) setError('Unable to load your staff passes. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const approvedApplications = useMemo(
    () => applications.filter(application => application.status === 'APPROVED'),
    [applications],
  );
  const selectedApplication = approvedApplications.find(application => application.id === routeApplicationId)
    ?? approvedApplications.find(application => application.invoice?.status === 'PAID')
    ?? approvedApplications[0];
  const selectedStaff = selectedApplication && selectedApplication.invoice?.status === 'PAID'
    ? staffMembers.filter(member => member.application.id === selectedApplication.id)
    : [];
  const query = searchQuery.trim().toLocaleLowerCase();
  const selectedApplicationMatches = Boolean(selectedApplication && (
    !query || matchesApplicationSearch(selectedApplication, query)
  ));
  const visibleSelectedStaff = selectedStaff.filter(member =>
    !query
    || selectedApplicationMatches
    || [member.name, member.email, member.entryPassId].some(value => value.toLocaleLowerCase().includes(query)),
  );
  const showSelectedApplication = selectedApplicationMatches || visibleSelectedStaff.length > 0;
  const otherApplications = approvedApplications.filter(application =>
    application.id !== selectedApplication?.id
    && (!query
      || matchesApplicationSearch(application, query)
      || staffMembers.some(member =>
        member.application.id === application.id
        && [member.name, member.email, member.entryPassId].some(value => value.toLocaleLowerCase().includes(query)),
      )),
  );
  const hasSearchResults = selectedApplicationMatches || visibleSelectedStaff.length > 0 || otherApplications.length > 0;

  return (
    <PageWrapper>
      <div className="vendor-dashboard-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-1 text-[11px] text-[#555]">
                <Link to="/vendor/staff" className="shrink-0 hover:text-[#171717]">Staff passes</Link>
                {selectedApplication?.event?.title && (
                  <>
                    <span>/</span>
                    <span className="truncate font-semibold text-[#222]">{selectedApplication.event.title}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField value={searchQuery} onChange={setSearchQuery} />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-3 pb-4 pt-3">
              {error && <p role="alert" className="mb-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-700">{error}</p>}
              {loading ? (
                <div role="status" className="rounded-lg border border-[#e5e5e5] bg-white p-8 text-center text-xs text-[#777]">
                  Loading staff passes…
                </div>
              ) : approvedApplications.length === 0 ? (
                <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center">
                  <h1 className="text-[13px] font-extrabold text-[#171717]">No approved stands yet</h1>
                  <p className="mt-1 text-[12px] text-[#777]">Staff passes will appear here after an organizer approves your stand application.</p>
                  <Link to="/vendor/applications" className="mt-3 inline-flex rounded-md bg-[#f15a2a] px-2.5 py-1.5 text-[12px] font-bold text-white hover:bg-[#e24d1f]">
                    View my applications
                  </Link>
                </div>
              ) : !hasSearchResults ? (
                <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center">
                  <p className="text-[12px] font-bold text-[#333]">No matching staff passes or events</p>
                  <p className="mt-1 text-[11px] text-[#777]">Try another event, staff name, email, or pass code.</p>
                </div>
              ) : selectedApplication ? (
                <>
                  {showSelectedApplication && (
                    <>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h1 className="truncate text-[22px] font-extrabold leading-7 tracking-tight text-[#151515]">Staff passes</h1>
                          <p className="mt-0.5 truncate text-[11px] text-[#777]">
                            {selectedApplication.event?.title ?? 'Event'}
                            {selectedApplication.assignedStand ? ` · Stand ${selectedApplication.assignedStand}` : ''}
                            {selectedApplication.event?.date ? ` · ${formatShortDate(selectedApplication.event.date)}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled
                          title="Adding staff after submitting an application is not supported yet."
                          className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-[#171717] px-2 text-[11px] font-bold text-white disabled:cursor-not-allowed"
                        >
                          <span aria-hidden="true">+</span> Add staff member
                        </button>
                      </div>

                      <InvoiceSummary application={selectedApplication} staffCount={selectedStaff.length} />

                      {selectedApplication.invoice?.status === 'PAID' ? (
                        <div className="mt-2 grid gap-2 min-[480px]:grid-cols-3">
                          {visibleSelectedStaff.map(member => (
                            <StaffPassCard key={member.id} member={member} application={selectedApplication} />
                          ))}
                          {!query && (
                            <div className="flex min-h-[142px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d9d9d9] bg-white/50 px-3 py-3 text-center">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f3f3f3] text-[12px] text-[#888]" aria-hidden="true">+</span>
                              <p className="mt-1 text-[11px] font-bold text-[#444]">Add staff member</p>
                              <p className="mt-0.5 max-w-[110px] text-[10px] leading-relaxed text-[#888]">
                                Add staff during your next stand application.
                              </p>
                              <button
                                type="button"
                                disabled
                                title="Adding staff after submitting an application is not supported yet."
                                className="mt-1.5 rounded border border-[#dedede] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#777]"
                              >
                                Add staff
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex min-h-[110px] items-center justify-center rounded-lg border border-dashed border-[#dedede] bg-white px-4 text-center">
                          <p className="max-w-[260px] text-[12px] leading-relaxed text-[#777]">
                            Staff passes unlock after the invoice is marked paid by the event organizer.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {otherApplications.length > 0 && (
                    <div className={`${showSelectedApplication ? 'mt-2' : ''} space-y-1.5`}>
                      {otherApplications.map(application => (
                        <OtherApplication key={application.id} application={application} />
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function InvoiceSummary({ application, staffCount }: { application: VendorApplication; staffCount: number }) {
  const paid = application.invoice?.status === 'PAID';

  return (
    <section className={`flex min-h-[24px] flex-wrap items-center justify-between gap-2 rounded-lg border px-2 py-1 ${
      paid ? 'border-[#e5e5e5] bg-white' : 'border-[#f2dfb6] bg-[#fffaf0]'
    }`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`shrink-0 rounded-full border px-1 py-0.5 text-[10px] font-bold leading-none ${
          paid ? 'border-[#8bd9ba] bg-[#e8fff5] text-[#138a61]' : 'border-[#ffc66d] bg-white text-[#bf6a00]'
        }`}>
          {paid ? 'Paid' : application.invoice ? 'Unpaid' : 'Pending'}
        </span>
        <p className="truncate text-[11px] text-[#555]">
          {application.invoice
            ? `Invoice ${application.invoice.invoiceNumber}${paid ? ' paid' : ` · ${formatCurrency(application.invoice.amount, application.invoice.currency)}`}`
            : 'No invoice is available for this application.'}
        </p>
      </div>
      {paid && (
        <p className="shrink-0 text-[11px] font-semibold text-[#333]">
          {staffCount} staff pass{staffCount === 1 ? '' : 'es'} issued
        </p>
      )}
    </section>
  );
}

function StaffPassCard({
  member,
  application,
}: {
  member: VendorStaffWithEvent;
  application: VendorApplication;
}) {
  const initials = member.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const emailHref = `mailto:${member.email}?subject=${encodeURIComponent(`Staff pass: ${application.event?.title ?? 'Event'}`)}&body=${encodeURIComponent(
    `Your entry pass for ${application.event?.title ?? 'the event'} is ${member.entryPassId}${application.assignedStand ? ` (Stand ${application.assignedStand})` : ''}.`,
  )}`;

  return (
    <article className="min-w-0 rounded-lg border border-[#e5e5e5] bg-white p-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="flex h-6 w-[18px] shrink-0 items-center justify-center rounded-full bg-[#f58a00] text-[10px] font-bold text-white">
          {initials || 'S'}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-bold leading-tight text-[#222]">{member.name}</h2>
          <a href={`mailto:${member.email}`} className="block truncate text-[10px] leading-tight text-[#777] hover:text-[#d15d2d]">
            {member.email}
          </a>
        </div>
      </div>

      <div className="my-1 flex justify-center">
        <QRCodeSVG value={member.entryPassId} size={76} level="M" title={`Staff entry pass ${member.entryPassId}`} />
      </div>
      <p className="text-center font-mono text-[10px] leading-tight text-[#333]">{member.entryPassId}</p>

      <div className="mt-1 grid grid-cols-2 gap-1">
        <a
          href={emailHref}
          className="rounded border border-[#d8d8d8] bg-white px-1 py-1 text-center text-[10px] font-medium text-[#444] hover:bg-slate-50"
        >
          Email pass
        </a>
        <button
          type="button"
          disabled
          title="Removing staff passes is not supported yet."
          className="rounded border border-[#d8d8d8] bg-white px-1 py-1 text-[10px] font-medium text-[#777]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function OtherApplication({ application }: { application: VendorApplication }) {
  const paid = application.invoice?.status === 'PAID';

  return (
    <section className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[#ededed] bg-[#f6f6f6] px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="flex h-6 w-[18px] shrink-0 items-center justify-center rounded-full bg-white text-[#888]" aria-hidden="true">
          <LockIcon />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-bold leading-tight text-[#333]">
            {application.event?.title ?? 'Event'}
            {application.assignedStand ? ` · Stand ${application.assignedStand}` : ''}
          </h2>
          <p className="truncate text-[10px] leading-tight text-[#777]">
            {paid
              ? 'Staff passes are available for this paid application.'
              : `Staff passes unlock when ${application.invoice?.invoiceNumber ?? 'the invoice'} (${formatCurrency(application.quotedAmount)}) is marked paid by the organizer.`}
          </p>
        </div>
      </div>
      <Link
        to="/vendor/applications"
        className="shrink-0 rounded border border-[#d8d8d8] bg-white px-1.5 py-1 text-[10px] font-medium text-[#444] hover:bg-slate-50"
      >
        View invoice
      </Link>
    </section>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function formatCurrency(value: number | string, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
}

function matchesApplicationSearch(application: VendorApplication, query: string) {
  return [
    application.event?.title,
    application.event?.venue,
    application.event?.date,
    application.requestedStandType,
    application.requestedStandSize,
    application.assignedStand,
    application.invoice?.invoiceNumber,
    application.status,
  ].some(value => value?.toLocaleLowerCase().includes(query));
}

function LockIcon() {
  return <svg aria-hidden="true" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 10V7a4 4 0 00-8 0v3m-2 0h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z" /></svg>;
}
