import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/layout/NotificationBell';
import { getEvents } from '@/services/eventService';
import { getUsers } from '@/services/userService';
import { getAdminAuditHistory, getAdminDashboardOverview, type AdminAuditEvent, type AdminDashboardOverview } from '@/services/adminService';
import { useAuth } from '@/context/useAuth';
import type { Event } from '@/types/event';
import type { User } from '@/types/user';

interface SearchResult {
  id: string;
  title: string;
  detail: string;
  kind: 'Event' | 'Person';
  to: string;
}

type RecentAuditEvent = AdminAuditEvent & { affectedUserName?: string };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentAuditEvent[]>([]);
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [showAwaitingMenu, setShowAwaitingMenu] = useState(true);
  const review = overview?.review;
  const statCards = [
    { title: 'Events to review', count: review?.events.count, oldest: review?.events.oldestWaitingHours, link: 'Open queue →', to: '/admin/approvals' },
    { title: 'Organisers to vet', count: review?.organizers.count, oldest: review?.organizers.oldestWaitingHours, link: 'Review →', to: '/admin/users/organizers/pending' },
    { title: 'Vendors to vet', count: review?.vendors.count, oldest: review?.vendors.oldestWaitingHours, link: 'Review →', to: '/admin/users/vendors/pending' },
  ];
  const summaryStats = [
    { label: 'Upcoming published events', value: overview?.reports.upcomingPublishedEvents },
    { label: 'Bookings this week', value: overview?.reports.bookingsThisWeek },
    { label: 'Attendance, last 30 days', value: overview ? `${overview.reports.attendanceLast30Days}%` : undefined },
  ];
  const reviewItems = [
    { label: 'Dashboard', active: true, count: 0 },
    { label: 'Awaiting Approval', active: false, count: 3 },
    { label: 'Organisers', active: false, count: 2 },
    { label: 'Vendors', active: false, count: 1 },
    { label: 'People', active: false, count: 0 },
    { label: 'Reports', active: false, count: 0 },
    { label: 'Audit history', active: false, count: 0 },
    { label: 'Notifications', active: false, count: 0 },
  ];

  useEffect(() => {
    let active = true;
    Promise.allSettled([getAdminAuditHistory(), getUsers(), getAdminDashboardOverview()]).then(([auditResult, usersResult, overviewResult]) => {
      if (active && overviewResult.status === 'fulfilled') setOverview(overviewResult.value.data.data);
      if (!active || auditResult.status !== 'fulfilled') return;
      const users = usersResult.status === 'fulfilled' ? usersResult.value.data.data : [];
      const userNames = new Map(users.map(user => [user.id, `${user.firstname} ${user.lastname}`]));
      setRecentActivity(auditResult.value.data.data.slice(0, 4).map(activity => ({
        ...activity,
        affectedUserName: activity.affectedUserId ? userNames.get(activity.affectedUserId) : undefined,
      })));
    });
    return () => { active = false; };
  }, []);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const [eventsResponse, usersResponse] = await Promise.all([getEvents(), getUsers()]);
      const eventResults: SearchResult[] = eventsResponse.data.data
        .filter((event: Event) => event.title.toLowerCase().includes(query))
        .slice(0, 5)
        .map((event: Event) => ({ id: event.id, title: event.title, detail: 'Event', kind: 'Event', to: `/events/${event.id}` }));
      const userResults: SearchResult[] = usersResponse.data.data
        .filter((user: User) => `${user.firstname} ${user.lastname} ${user.email}`.toLowerCase().includes(query))
        .slice(0, 5)
        .map((user: User) => ({
          id: user.id,
          title: `${user.firstname} ${user.lastname}`,
          detail: `${user.email} · ${user.role.toLowerCase()}`,
          kind: 'Person',
          to: user.role === 'ORGANIZER' ? '/admin/users/organizers' : user.role === 'VENDOR' ? '/admin/users/vendors' : '/admin/user-accounts',
        }));
      setSearchResults([...eventResults, ...userResults]);
      if (eventResults.length === 0 && userResults.length === 0) setSearchError('No matching events or people found.');
    } catch {
      setSearchError('Search could not be completed. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-full bg-transparent text-[#1f2937] antialiased">
      <div className="w-full overflow-hidden rounded-[12px] border border-[#dfe3ea] bg-[#f4f4f2]">
        <div className="flex">
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
                            navigate('/admin/users/organizers');
                          }}
                          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-[#4b5563] hover:bg-[#f4f5f7] hover:text-[#1f2937]"
                        >
                          Organizers Requests
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveItem('Awaiting Approval');
                            navigate('/admin/users/vendors');
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
                <form onSubmit={handleSearch} className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]">
                    <SearchIcon />
                  </span>
                  <input
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); setSearchResults([]); setSearchError(''); }}
                    aria-label="Search events and people"
                    placeholder="Search events, people..."
                    className="h-10 w-[230px] rounded-lg border border-[#dfe3ea] bg-white pl-9 pr-3 text-[13px] text-[#2d3748] placeholder:text-[#9aa3af] focus:outline-none"
                  />
                  {(searchResults.length > 0 || searchError || searching) && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-xl">
                      {searching ? <p className="px-4 py-3 text-sm text-[#6b7280]">Searching...</p> : searchError ? <p className="px-4 py-3 text-sm text-[#6b7280]">{searchError}</p> : (
                        <ul className="max-h-80 divide-y divide-[#eef0f3] overflow-y-auto">
                          {searchResults.map((result) => (
                            <li key={`${result.kind}-${result.id}`}>
                              <button type="button" onClick={() => navigate(result.to)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f7f8fa]">
                                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#1f2937]">{result.title}</span><span className="block truncate text-xs text-[#6b7280]">{result.detail}</span></span>
                                <span className="shrink-0 text-[10px] font-bold uppercase text-[#8c93a0]">{result.kind}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </form>
                <NotificationBell />
              </div>
            </div>

            <div className="mb-5">
              <h1 className="text-[31px] font-extrabold tracking-[-0.05em] text-[#1f2937]">Good morning, {user?.firstname || 'Admin'}</h1>
              <p className="mt-1 text-[14px] text-[#6b7280]">{overview ? `${statCards.reduce((total, card) => total + (card.count ?? 0), 0)} items are waiting for a decision.` : 'Loading review queue…'}</p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {statCards.map((card, index) => (
                <div key={card.title} className={`rounded-[12px] border border-[#dfe3ea] p-4 ${index === 0 ? 'bg-[#f5efe4] text-[#1f2937]' : 'bg-white text-[#1f2937]'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[15px] font-semibold text-[#1f2937]">{card.title}</div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#dfe3ea] bg-white text-[#5d6573]">
                      {index === 0 ? <ListIcon /> : <UsersIcon />}
                    </span>
                  </div>
                  <div className="text-[32px] font-extrabold tracking-[-0.04em] text-[#111827]">{card.count ?? '—'}</div>
                  <div className="mt-1 text-[12px] text-[#6b7280]">{card.oldest == null ? 'No items waiting' : `Oldest waiting ${formatWaiting(card.oldest)}`}</div>
                  <button type="button" onClick={() => navigate(card.to)} className="mt-3 text-[12px] font-semibold text-[#d14d74] hover:text-[#bf3158]">{card.link}</button>
                </div>
              ))}
            </div>

            <section id="reports" aria-labelledby="admin-reports-title" className="mb-6 scroll-mt-5">
              <h2 id="admin-reports-title" className="mb-3 text-[31px] font-extrabold tracking-[-0.05em] text-[#1f2937]">Reports overview</h2>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {summaryStats.map(stat => (
                  <div key={stat.label} className="rounded-[12px] border border-[#e5e7eb] bg-white px-4 py-5">
                    <div className="text-[12px] font-medium text-[#697482]">{stat.label}</div>
                    <div className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-[#111827]">{stat.value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="admin-recent-activity-title" className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="admin-recent-activity-title" className="text-[15px] font-bold text-[#1f2937]">Recent activity</h2>
                <button type="button" onClick={() => navigate('/admin/audit')} className="shrink-0 text-[11px] font-bold text-rose-700 hover:text-rose-800">
                  Audit history →
                </button>
              </div>
              {recentActivity.length > 0 ? (
                <ul className="divide-y divide-[#eef0f3]">
                  {recentActivity.map(activity => (
                    <li key={activity.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dcebf7] text-[9px] font-bold text-[#24517d]">
                        {`${activity.actor.firstname[0] ?? ''}${activity.actor.lastname[0] ?? ''}`.toUpperCase() || 'A'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] leading-4 text-[#1f2937]">
                          <span className="font-bold">{activity.actor.firstname} {activity.actor.lastname}</span>{' '}
                          {formatAuditAction(activity.action)}
                          {activity.affectedUserName && <span className="text-[#5f6b7a]"> · {activity.affectedUserName}</span>}
                        </p>
                        <p className="mt-0.5 text-[10px] capitalize text-[#6b7280]">{activity.outcome.replaceAll('_', ' ')}</p>
                      </div>
                      <time dateTime={activity.createdAt} className="shrink-0 pt-0.5 text-[10px] text-[#8c93a0]">
                        {new Date(activity.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-sm text-[#6b7280]">No recent administrative activity.</p>
              )}
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    ORGANIZER_PROFILE_APPROVED: 'approved an organizer profile',
    ORGANIZER_PROFILE_REJECTED: 'rejected an organizer profile',
    ORGANIZER_ACCOUNT_CREATED: 'created an organizer account',
    ORGANIZER_ACCOUNT_DELETED: 'deleted an organizer account',
    VENDOR_PROFILE_APPROVED: 'approved a vendor profile',
    VENDOR_PROFILE_REJECTED: 'rejected a vendor profile',
    VENDOR_ACCOUNT_DELETED: 'deleted a vendor account',
    ADMIN_ACCOUNT_CREATED: 'created an admin account',
    ADMIN_ACCOUNT_STATUS_UPDATED: 'updated an admin account',
  };
  return labels[action] ?? action.toLowerCase().replaceAll('_', ' ');
}

function formatWaiting(hours: number) {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} day${days === 1 ? '' : 's'} ${remainingHours} h` : `${days} day${days === 1 ? '' : 's'}`;
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
