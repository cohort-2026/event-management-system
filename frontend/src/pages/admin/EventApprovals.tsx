import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type EventApproval = {
  name: string;
  meta: string;
  status: 'submitted' | 'new' | 'resubmitted';
  waiting: string;
  date: string;
  accent: string;
  badge: string;
  review: string;
  banner: string;
  venue: string;
  description: string;
  capacity: string;
  ticketTypes: string;
  stands: string;
  bookedSoFar: string;
  changes: Array<{ label: string; old: string; new: string }>;
  organizer: string;
  organizerDetails: string;
  approved: boolean;
};

export function EventApprovalReviewPanel({ approval, onBack }: { approval: EventApproval; onBack: () => void }) {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 rounded-[12px] border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="mb-4 flex items-center gap-2 text-[12px] font-medium text-[#5f6b7a]">
          <button type="button" onClick={onBack} className="text-[#4b5563] hover:text-[#1f2937]">Awaiting Approval</button>
          <span>/</span>
          <span className="text-[#1f2937]">{approval.name}</span>
        </div>

        <div className="rounded-[12px] border border-[#e0e3e8] bg-[#f8f8f8] p-4">
          <div className="mb-4 rounded-[14px] bg-gradient-to-r from-[#ff7a59] via-[#ea4c5a] to-[#f8bc51] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#fff3ef]">
                <span className="rounded bg-white/20 px-2 py-0.5">{approval.banner}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex-1">
                <h2 className="text-[26px] font-extrabold leading-none tracking-[-0.05em] text-white">{approval.name}</h2>
                <div className="mt-3 text-[13px] text-[#fff8f6]">{approval.venue}</div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[26px] text-white/80">◉</div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 text-[13px] text-[#4b5563]">
            <div>
              <span className="mr-2 font-bold">Capacity</span>
              <span>{approval.capacity}</span>
            </div>
            <div>
              <span className="mr-2 font-bold">Ticket types</span>
              <span>{approval.ticketTypes}</span>
            </div>
            <div>
              <span className="mr-2 font-bold">Stands</span>
              <span>{approval.stands}</span>
            </div>
            <div>
              <span className="mr-2 font-bold">Booked so far</span>
              <span>{approval.bookedSoFar}</span>
            </div>
          </div>

          <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-4">
            <div className="mb-2 text-[14px] font-bold text-[#1f2937]">What changed since you approved it on 24 Oct</div>
            {approval.changes.length > 0 ? (
              <div className="space-y-2 text-[13px] text-[#4b5563]">
                {approval.changes.map((change) => (
                  <div key={change.label} className="grid grid-cols-[120px_1fr_1fr] gap-3">
                    <span className="font-medium text-[#6b7280]">{change.label}</span>
                    <span className="text-[#ef4444] line-through">{change.old}</span>
                    <span className="text-[#22c55e]">{change.new}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[#4b5563]">No change information provided.</div>
            )}
          </div>

          <div className="mt-4 rounded-[10px] border border-[#e5e7eb] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5c2ae] text-[13px] font-bold text-[#7a3e2a]">JD</div>
                <div>
                  <div className="font-semibold text-[#1f2937]">{approval.organizer}</div>
                  <div className="text-[12px] text-[#6b7280]">{approval.organizerDetails}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#dfe3ea] bg-[#f2f8f5] px-2 py-1 text-[12px] font-medium text-[#16a34a]">
                <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-[320px] shrink-0 rounded-[12px] border border-[#e5e7eb] bg-[#f8f8f8] p-4">
        <div className="mb-4 text-[18px] font-bold text-[#1f2937]">Your decision</div>

        <div className="mb-4 rounded-[10px] border border-[#e5e7eb] bg-white p-3 text-[12px] text-[#4b5563]">
          <div className="mb-2 text-[#1f2937]">Submitted · waiting 1d 4h</div>
          <div className="mb-3 font-semibold text-[#1f2937]">Checklist</div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-[#1f2937]" /><span>Date, time and venue are complete</span></li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-[#1f2937]" /><span>Description is appropriate and accurate</span></li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-[#1f2937]" /><span>Capacity fits the venue</span></li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-[#1f2937]" /><span>Accessibility information included</span></li>
          </ul>
          <div className="mt-3 rounded bg-[#fef3c7] p-2 text-[#92400e]">Reason (required to reject changes)</div>
        </div>

        <label className="mb-2 block text-[12px] font-semibold text-[#4b5563]">Missing venue details</label>
        <textarea
          readOnly
          value="Tell the organiser exactly what to fix."
          className="h-[100px] w-full resize-none rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 text-[13px] text-[#374151] outline-none"
        />

        <div className="mt-5 rounded-[10px] border border-[#e8e0dc] bg-[#fff7f2] p-3 text-[12px] text-[#7c4a35]">
          Approving publishes the event straight away and emails the organiser.
        </div>

        <div className="mt-5 space-y-2">
          <button type="button" className="w-full rounded-lg bg-[#f15d5d] px-4 py-3 text-[14px] font-bold text-white shadow-sm hover:bg-[#e64f4f]">Approve and publish</button>
          <button type="button" className="w-full rounded-lg border border-[#f1b6b7] bg-white px-4 py-3 text-[14px] font-bold text-[#d94d5f] hover:bg-[#fff6f6]">Request changes</button>
        </div>
      </aside>
    </div>
  );
}

export default function EventApprovals() {
  const navigate = useNavigate();
  const reviewItems = [
    { label: 'Dashboard', active: false, count: 0 },
    { label: 'Awaiting Approval', active: true, count: 3 },
    { label: 'Organisers', active: false, count: 2 },
    { label: 'Vendors', active: false, count: 1 },
    { label: 'People', active: false, count: 0 },
    { label: 'Reports', active: false, count: 0 },
    { label: 'Audit history', active: false, count: 0 },
    { label: 'Notifications', active: false, count: 0 },
  ];

  const [selectedApproval, setSelectedApproval] = useState<EventApproval | null>(null);
  const [activeItem, setActiveItem] = useState('Awaiting Approval');
  const [showAwaitingMenu, setShowAwaitingMenu] = useState(true);

  return (
    <div className="min-h-full bg-transparent text-[#1f2937] antialiased">
      <div className="w-full overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-[#f5f5f3]">
        <div className="flex min-h-[680px]">
          <aside className="hidden">
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#f3f4f5] px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f15d5d] text-sm font-bold text-white">E</div>
              <div className="text-[29px] font-extrabold tracking-[-0.05em] text-[#1f2937]">EventMS</div>
            </div>

            <div className="mb-3 px-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8c93a0]">Admin</div>
            <nav className="space-y-1.5">
              {reviewItems.map((item) => {
                const isAwaiting = item.label === 'Awaiting Approval';
                const isActive = activeItem === item.label;

                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item.label);

                        if (isAwaiting) {
                          setShowAwaitingMenu((current) => !current);
                          setSelectedApproval(null);
                          navigate('/admin/approvals');
                          return;
                        }
                        if (item.label === 'Dashboard') navigate('/admin');
                        if (item.label === 'Organisers') navigate('/admin/users/organizers');
                        if (item.label === 'Vendors') navigate('/admin/users/vendors');
                        if (item.label === 'People') navigate('/admin/user-accounts');
                        if (item.label === 'Audit history') navigate('/admin/audit');
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] ${
                        isActive ? 'bg-[#f0e7ee] text-[#1f2937] shadow-inner shadow-[#efe2eb]' : 'text-[#4b5563] hover:bg-[#eef1f4]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`flex h-4 w-4 items-center justify-center ${isActive ? 'text-[#d14d74]' : 'text-[#6b7280]'}`}>
                          {item.label === 'Dashboard' ? <HomeIcon /> : item.label === 'Awaiting Approval' ? <ListIcon /> : item.label === 'Organisers' ? <UsersIcon /> : item.label === 'Vendors' ? <StoreIcon /> : item.label === 'People' ? <UsersIcon /> : item.label === 'Reports' ? <ReportIcon /> : item.label === 'Audit history' ? <ShieldIcon /> : <BellIcon />}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {item.count > 0 && (
                          <span className="min-w-[18px] rounded-full bg-[#f7dfe4] px-1.5 py-0.5 text-center text-[11px] font-bold text-[#d14d74]">
                            {item.count}
                          </span>
                        )}
                        {isAwaiting && (
                          <span className="text-[10px] font-bold text-[#687280]">{showAwaitingMenu ? '▾' : '▸'}</span>
                        )}
                      </span>
                    </button>

                    {isAwaiting && showAwaitingMenu && (
                      <div className="ml-6 space-y-1 rounded-lg border border-[#e7e9ed] bg-white/80 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveItem('Awaiting Approval');
                            navigate('/admin/users/organizers/pending');
                          }}
                          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-[#4b5563] hover:bg-[#f4f5f7] hover:text-[#1f2937]"
                        >
                          Organizers Requests
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveItem('Awaiting Approval');
                            navigate('/admin/users/vendors/pending');
                          }}
                          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-[#4b5563] hover:bg-[#f4f5f7] hover:text-[#1f2937]"
                        >
                          Vendors Requests
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto pt-8">
              <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#cfe9f8] text-[13px] font-bold text-[#24517d]">JV</div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#1f2937]">Johan van Wyk</div>
                  <div className="truncate text-[12px] text-[#6b7280]">Administrator</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e7c5c5] bg-[#fff7f7] px-3 py-2 text-[13px] font-semibold text-[#ad3a4a] transition hover:bg-[#fff1f2]"
              >
                <LogoutIcon />
                Log out
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1 bg-[#f7f7f6] p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="text-[15px] font-semibold text-[#5a6470]">Dashboard</div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]">
                    <SearchIcon />
                  </span>
                  <input
                    value=""
                    aria-label="Search"
                    readOnly
                    placeholder="Search events, people..."
                    className="h-10 w-[230px] rounded-lg border border-[#dfe3ea] bg-white pl-9 pr-3 text-[13px] text-[#2d3748] placeholder:text-[#9aa3af] focus:outline-none"
                  />
                </div>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe3ea] bg-white text-[#687280]">
                  <BellIcon />
                </button>
              </div>
            </div>

            {selectedApproval ? (
              <EventApprovalReviewPanel approval={selectedApproval} onBack={() => setSelectedApproval(null)} />
            ) : (
              <>
                <div className="mb-5 px-1">
                  <h1 className="text-[33px] font-extrabold tracking-[-0.06em] text-[#1f2937]">Awaiting Approval</h1>
                  <p className="mt-1 text-[15px] text-[#5f6b7a]">Nothing is public until you approve it.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/users/organizers/pending')}
                    className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:bg-[#fafafa]"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-[18px] font-bold text-[#1f2937]">Organizers Requests</div>
                      <span className="rounded-full bg-[#f5edf0] px-2 py-1 text-[11px] font-bold text-[#d14d74]">3</span>
                    </div>
                    <div className="text-[13px] text-[#6b7280]">Profiles waiting for organizer approval.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/admin/users/vendors/pending')}
                    className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:bg-[#fafafa]"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-[18px] font-bold text-[#1f2937]">Vendors Requests</div>
                      <span className="rounded-full bg-[#f5edf0] px-2 py-1 text-[11px] font-bold text-[#d14d74]">2</span>
                    </div>
                    <div className="text-[13px] text-[#6b7280]">Profiles waiting for vendor approval.</div>
                  </button>
                </div>
              </>
            )}
          </main>
        </div>
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

function LogoutIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
