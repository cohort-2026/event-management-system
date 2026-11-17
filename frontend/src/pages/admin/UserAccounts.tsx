import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sidebarItems = [
  { label: 'Dashboard', active: false },
  { label: 'Event approvals', active: false, count: 3 },
  { label: 'Organisers', active: false, count: 2 },
  { label: 'Vendors', active: false, count: 1 },
  { label: 'People', active: true },
  { label: 'Reports', active: false },
  { label: 'Audit history', active: false },
  { label: 'Notifications', active: false },
];

const people = [
  { name: 'Lerato Mokoena', email: 'lerato@jozidev.co.za', role: 'Organizer', org: 'Jozi Collective', status: 'Active', lastActive: 'Today', initials: 'LM', tone: 'bg-[#d7e8f8] text-[#2c4d7a]' },
  { name: 'Noma Sa', email: 'noma@cile', role: 'Management', org: 'N/A', status: 'Invited', lastActive: 'Never', initials: 'NM', tone: 'bg-[#f2d5f5] text-[#7b3d7d]' },
  { name: 'Sizwe Ndlo', email: 'sizwe@kasic', role: 'Management', org: 'N/A', status: 'Active', lastActive: 'Yesterday', initials: 'SN', tone: 'bg-[#f5d3ba] text-[#8f4e23]' },
  { name: 'Thandi Nko', email: 'thandi@nkosi', role: 'Attendee', org: 'N/A', status: 'Active', lastActive: 'Today', initials: 'TN', tone: 'bg-[#dfeec2] text-[#3d5f25]' },
  { name: 'Karabo Dube', email: 'karabo@dube', role: 'Vendor', org: 'CloudVeld', status: 'Active', lastActive: '2 days ago', initials: 'KD', tone: 'bg-[#d9e8ff] text-[#214d7d]' },
  { name: 'Test Org 2', email: 'test@east.com', role: 'Organizer', org: 'Test Org 2', status: 'Deactivated', lastActive: '6 Nov', initials: 'TO', tone: 'bg-[#f0f0f0] text-[#404b5a]' },
];

const roleTabs = [
  { label: 'All roles', role: null },
  { label: 'Attendees 181', role: 'Attendee' },
  { label: 'Organisers 12', role: 'Organizer' },
  { label: 'Vendors 24', role: 'Vendor' },
  { label: 'Management 3', role: 'Management' },
  { label: 'Admins 4', role: 'Admin' },
];

export default function UserAccounts() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const filteredPeople = people.filter((person) => {
    const matchesRole = selectedRole === null || person.role === selectedRole;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || person.name.toLowerCase().includes(query) || person.email.toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="min-h-full bg-transparent text-[#1f2937] antialiased">
      <div className="flex min-h-[680px] w-full overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-[#f4f4f2]">
        <aside className="hidden">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#f3f4f5] px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f15d5d] text-sm font-bold text-white">E</div>
            <div className="text-[29px] font-extrabold tracking-[-0.05em] text-[#1f2937]">EventMS</div>
          </div>

          <div className="mb-3 px-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8c93a0]">Admin</div>
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.label === 'Dashboard') navigate('/admin');
                  if (item.label === 'Event approvals') navigate('/admin/approvals');
                  if (item.label === 'Organisers') navigate('/admin/users/organizers');
                  if (item.label === 'Vendors') navigate('/admin/users/vendors');
                  if (item.label === 'People') navigate('/admin/user-accounts');
                  if (item.label === 'Audit history') navigate('/admin/audit');
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] ${
                  item.active ? 'bg-[#f4dfe7] text-[#1f2937] shadow-inner shadow-[#efe2eb]' : 'text-[#4b5563] hover:bg-[#eef1f4]'
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
            <div className="text-[15px] font-semibold text-[#5a6470]">People</div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]">
                  <SearchIcon />
                </span>
                <input
                  value=""
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

          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[33px] font-extrabold tracking-[-0.06em] text-[#1f2937]">People</h1>
              <div className="mt-1 text-[14px] text-[#5f6b7a]">1 046 accounts</div>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f5f5f4] p-1">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Filter by name or email"
                placeholder="Name or email"
                className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-3 text-[13px] text-[#2d3748] placeholder:text-[#9aa3af] focus:outline-none focus:ring-2 focus:ring-[#9aa3af]"
              />
            </div>
            {roleTabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                aria-pressed={selectedRole === tab.role}
                onClick={() => setSelectedRole(tab.role)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  selectedRole === tab.role ? 'bg-[#1f2937] text-white' : 'text-[#526071] hover:bg-white hover:text-[#1f2937]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#e5e7eb] bg-white">
            <div className="grid grid-cols-[1.6fr_1.1fr_1.2fr_0.9fr_0.7fr_36px] items-center gap-3 bg-[#f8f8f7] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6b7280]">
              <div>Person</div>
              <div>Role</div>
              <div>Organisation</div>
              <div>Status</div>
              <div>Last active</div>
              <div />
            </div>

            <div className="divide-y divide-[#e5e7eb]">
              {filteredPeople.map((person) => (
                <div key={person.email} className="grid grid-cols-[1.6fr_1.1fr_1.2fr_0.9fr_0.7fr_36px] items-center gap-3 px-4 py-3 text-[13px] text-[#1f2937]">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold ${person.tone}`}>
                      {person.initials}
                    </div>
                    <div>
                      <div className="font-semibold">{person.name}</div>
                      <div className="text-[12px] text-[#6b7280]">{person.email}</div>
                    </div>
                  </div>
                  <div className="text-[#464f5d]">{person.role}</div>
                  <div className="text-[#464f5d]">{person.org}</div>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${
                      person.status === 'Active' ? 'bg-[#dff6ed] text-[#1a8c72]' : person.status === 'Invited' ? 'bg-[#dff3ff] text-[#0f6a94]' : person.status === 'Deactivated' ? 'bg-[#f6dfe1] text-[#a1394d]' : 'bg-[#f0f1f4] text-[#5f6b7a]'
                    }`}>
                      {person.status}
                    </span>
                  </div>
                  <div className="text-[#464f5d]">{person.lastActive}</div>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-[#697586] hover:bg-[#f3f4f6]">
                    <MoreIcon />
                  </button>
                </div>
              ))}
              {filteredPeople.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-[#6b7280]">No people match the selected filters.</p>
              )}
            </div>
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

function MoreIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>;
}


