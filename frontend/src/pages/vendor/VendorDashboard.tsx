import { Link } from 'react-router-dom';
import NotificationBell from '@/components/layout/NotificationBell';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar, { VendorMenuButton } from '@/components/layout/VendorSidebar';
import VendorSearchField from '@/components/layout/VendorSearchField';

export default function VendorDashboard() {
  return (
    <PageWrapper>
      <div className="vendor-dashboard-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar accountSubtitle="Kasi Coffee Co." />

          <div className="min-w-0 flex-1">
            <header className="vendor-topbar sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <div className="flex min-w-0 items-center gap-2">
                <VendorMenuButton />
                <span className="truncate text-[12px] font-semibold text-[#333]">Overview</span>
              </div>
              <div className="flex items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-4 pb-6 pt-5 sm:px-6 lg:px-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-3xl font-extrabold tracking-tight text-[#151515] sm:text-4xl">Kasi Coffee Co.</h1>
                  <p className="text-[13px] leading-5 text-[#777]">Approved vendor - Sizwe Ndlovu</p>
                </div>
                <Link
                  to="/vendor/events"
                  className="inline-flex h-[34px] shrink-0 items-center gap-1 rounded-md bg-gradient-to-r from-[#ed1744] to-[#ff6a00] px-3 text-[12px] font-bold text-white shadow-sm transition hover:brightness-95"
                >
                  <SearchIcon />
                  Find events
                </Link>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Upcoming stands" value="2" />
                <StatTile label="Under review" value="1" />
                <StatTile label="To pay" value="R 850" note="due Thu 12 Nov" />
                <StatTile label="Staff passes" value="2" />
              </div>
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-h-[86px] min-w-0 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2">
      <p className="truncate text-[12px] font-medium leading-4 text-[#555]">{label}</p>
      <div className="mt-1 text-[24px] font-extrabold leading-7 text-[#171717]">{value}</div>
      {note && <p className="text-[12px] font-semibold leading-4 text-[#e65b1f]">{note}</p>}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 shrink-0" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}
