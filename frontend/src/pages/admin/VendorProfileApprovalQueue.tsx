const sidebarItems = [
  { label: 'Dashboard', active: false },
  { label: 'Event approvals', active: false, count: 3 },
  { label: 'Organisers', active: false },
  { label: 'Vendors', active: true, count: 1 },
  { label: 'People', active: false },
  { label: 'Reports', active: false },
  { label: 'Audit history', active: false },
  { label: 'Notifications', active: false },
];

const tabs = [
  { label: 'Pending', count: 1, active: true },
  { label: 'Approved', count: 23, active: false },
  { label: 'Rejected', count: 4, active: false },
  { label: 'Inactive', count: 0, active: false },
];

const documents = ['CIPC certificate.pdf', 'VAT registration.pdf', 'EEF affidavit.pdf'];

export default function VendorProfileApprovalQueue({ status = 'PENDING_REVIEW' }: { status?: 'PENDING_REVIEW' | 'APPROVED' }) {
  const isApproved = status === 'APPROVED';

  return (
    <div className="min-h-full bg-transparent text-[#1f2937] antialiased">
      <div className="flex min-h-[680px] w-full overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-[#f3f3f1]">
        <aside className="hidden">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#f3f4f5] px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f15d5d] text-sm font-bold text-white">E</div>
            <div className="text-[30px] font-extrabold tracking-[-0.06em] text-[#1f2937]">EventMS</div>
          </div>

          <div className="mb-3 px-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8c93a0]">Admin</div>
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] ${
                  item.active ? 'bg-[#f0e7ee] text-[#1f2937] shadow-inner shadow-[#efe2eb]' : 'text-[#4b5563] hover:bg-[#eef1f4]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-4 w-4 items-center justify-center ${item.active ? 'text-[#d14d74]' : 'text-[#6b7280]'}`}>
                    {item.label === 'Dashboard' ? <HomeIcon /> : item.label === 'Event approvals' ? <ListIcon /> : item.label === 'Organisers' ? <UsersIcon /> : item.label === 'Vendors' ? <StoreIcon /> : item.label === 'People' ? <UsersIcon /> : item.label === 'Reports' ? <ReportIcon /> : item.label === 'Audit history' ? <ShieldIcon /> : <BellIcon />}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </span>
                {item.count ? (
                  <span className="min-w-[18px] rounded-full bg-[#f7dfe4] px-1.5 py-0.5 text-center text-[11px] font-bold text-[#d14d74]">
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#cfe9f8] text-[13px] font-bold text-[#24517d]">JV</div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-[#1f2937]">Johan van Wyk</div>
                <div className="truncate text-[12px] text-[#6b7280]">Administrator</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#f7f7f6] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="text-[15px] font-semibold text-[#5a6470]">Vendors</div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]">
                  <SearchIcon />
                </span>
                <input
                  value=""
                  readOnly
                  aria-label="Search vendors"
                  placeholder="Search events, people..."
                  className="h-10 w-[240px] rounded-lg border border-[#dfe3ea] bg-white pl-9 pr-3 text-[13px] text-[#2d3748] placeholder:text-[#9aa3af] focus:outline-none"
                />
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe3ea] bg-white text-[#687280]">
                <BellIcon />
              </button>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <h1 className="text-[34px] font-extrabold tracking-[-0.06em] text-[#1f2937]">Vendors</h1>
            <button type="button" className="rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 text-[13px] font-semibold text-[#2d3748] shadow-sm">
              Export
            </button>
          </div>

          <div className="mb-5 flex gap-3 overflow-hidden rounded-[12px] border border-[#e5e7eb] bg-[#f2f3f2] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                className={`flex items-center gap-2 rounded-[9px] px-3 py-2 text-[14px] font-medium ${
                  tab.active ? 'bg-[#e6e7e8] text-[#1f2937]' : 'text-[#65707d]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#374151]">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="grid h-[calc(100%-220px)] min-h-[560px] grid-cols-[1.2fr_1.7fr] gap-5">
            <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e6e8eb] bg-[#f4f6f8] px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5ad1c3] text-[16px] font-bold text-white">CV</div>
                  <div>
                    <div className="text-[18px] font-bold text-[#1f2937]">CloudVeld Hosting (Pty) Ltd</div>
                    <div className="mt-1 text-[12px] text-[#5f6b7a]">Technology · 3 documents</div>
                  </div>
                </div>
                <div className="rounded-full bg-[#f0f1f4] px-2 py-1 text-[12px] font-medium text-[#4b5563]">2h</div>
              </div>
            </section>

            <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4fc3b1] text-[16px] font-bold text-white">CV</div>
                  <div>
                    <div className="text-[20px] font-bold text-[#1f2937]">CloudVeld Hosting (Pty) Ltd</div>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isApproved ? 'border-[#dfe3ea] bg-[#f0f1f4] text-[#4b5563]' : 'border-[#d7f1ea] bg-[#ebfbf7] text-[#188b72]'
                }`}>
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${isApproved ? 'bg-[#4b5563]' : 'bg-[#188b72]'}`} />
                  {isApproved ? 'Approved' : 'Pending review'}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f7f7f7] p-3">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">CIPC number</div>
                  <div className="mt-2 text-[14px] font-semibold text-[#1f2937]">2021/119845/07</div>
                </div>
                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f7f7f7] p-3">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">VAT number</div>
                  <div className="mt-2 text-[14px] font-semibold text-[#1f2937]">4120338871</div>
                </div>
                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f7f7f7] p-3">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">Category</div>
                  <div className="mt-2 text-[14px] font-semibold text-[#1f2937]">Technology</div>
                </div>
              </div>

              <div className="mb-5 rounded-[12px] border border-[#e5e7eb] bg-[#f9f9f9] p-4">
                <div className="mb-3 text-[16px] font-bold text-[#1f2937]">Documents</div>
                <div className="grid grid-cols-3 gap-3">
                  {documents.map((doc, index) => (
                    <div key={doc} className="rounded-[10px] border border-[#dfe3ea] bg-[#f1f1f1] p-2">
                      <div className="mx-auto mb-3 h-[96px] rounded-[8px] border border-[#dfe3ea] bg-[#e5e7eb]">
                        <div className="flex h-full items-center justify-center">
                          <div className={`h-5 w-5 rounded-sm ${index === 0 ? 'bg-[#f2b8b8]' : index === 1 ? 'bg-[#d9d9d9]' : 'bg-[#d9d9d9]'}`} />
                        </div>
                      </div>
                      <div className="text-center text-[12px] font-medium text-[#4b5563]">{doc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 text-[16px] font-bold text-[#1f2937]">About</div>
                <p className="text-[14px] text-[#4b5563] leading-6">
                  South African cloud hosting with data centres in Johannesburg and Cape Town. Wants sponsor booths at developer events.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" className="rounded-lg bg-[#1f2937] px-4 py-3 text-[14px] font-bold text-white shadow-sm hover:bg-[#111827]">
                  Approve vendor
                </button>
                <button type="button" className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 text-[14px] font-bold text-[#374151] hover:bg-[#f3f4f6]">
                  Reject with reason...
                </button>
                <button type="button" className="ml-auto rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 text-[14px] font-bold text-[#374151] hover:bg-[#f3f4f6]">
                  Deactivate
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-7.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" /></svg>;
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8v-1a4 4 0 0 0-3-3.87M20 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function StoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 8h16l-1 11H5L4 8Zm3-3h10l1 3H6l1-3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ReportIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M7 18V9m5 9V5m5 13v-7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 3 5 6v5c0 5 3.4 8.6 7 10 3.6-1.4 7-5 7-10V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>;
}
