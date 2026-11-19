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
                  <h1 className="truncate text-[22px] font-extrabold leading-7 tracking-tight text-[#151515]">Kasi Coffee Co.</h1>
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

              <h2 className="mb-2 text-[16px] font-extrabold leading-5 text-[#171717]">Your stands</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <StandCard
                  title="Joburg Tech Summit 2026"
                  stand="B4"
                  subtitle="Thu 3 Dec - Sandton Convention Centre - set-up from 06:30"
                  gradient="from-[#ff8c63] via-[#f44636] to-[#a72512]"
                  artwork="warm"
                  stages={['Applied', 'Allocated', 'Pay invoice', 'Staff passes']}
                  completedStages={2}
                  invoice="INV-2026-0042 - R 850.00 - due 12 Nov"
                  action="Download PDF"
                />
                <StandCard
                  title="Soweto Food & Jazz Fest"
                  stand="A7"
                  subtitle="12 Dec - Walter Sisulu Square, Kliptown"
                  gradient="from-[#171717] via-[#ed4b23] to-[#ff9915]"
                  artwork="festival"
                  stages={['Applied', 'Allocated', 'Paid', '2 passes']}
                  completedStages={4}
                  invoice="All set. Paid 2 Nov."
                  action="Manage staff"
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <section className="min-h-[100px] rounded-lg border border-[#e5e5e5] bg-white p-3">
                  <h2 className="mb-2 text-[15px] font-extrabold leading-5 text-[#171717]">Under review</h2>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-[#ac3cff] via-[#d64aa3] to-[#6b57db]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold leading-4 text-[#222]">Women in Data Meetup</p>
                      <p className="truncate text-[12px] leading-4 text-[#777]">3m x 3m - R 300 quote - sent 2 days ago</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#ffc66d] px-1.5 py-1 text-[12px] font-semibold leading-none text-[#bf6a00]">Applied</span>
                  </div>
                </section>

                <section className="min-h-[100px] rounded-lg border border-[#e5e5e5] bg-white p-3">
                  <h2 className="mb-2 text-[15px] font-extrabold leading-5 text-[#171717]">Looking for vendors</h2>
                  <MiniEventCard title="Year-end Family Fun Day" date="5 Dec" left={8} />
                  <MiniEventCard title="Durban Design Sprint" date="1 Dec" left={5} />
                </section>
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

function StandCard({
  title,
  stand,
  subtitle,
  gradient,
  artwork,
  stages,
  completedStages,
  invoice,
  action,
}: {
  title: string;
  stand: string;
  subtitle: string;
  gradient: string;
  artwork: 'warm' | 'festival';
  stages: string[];
  completedStages: number;
  invoice: string;
  action: string;
}) {
  return (
    <article className="flex min-h-[230px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
      <div className={`relative flex h-[58px] shrink-0 items-center justify-between gap-2 overflow-hidden bg-gradient-to-r ${gradient} px-3 text-white`}>
        {artwork === 'warm' ? (
          <>
            <span className="absolute -right-1 -top-5 h-16 w-16 rounded-full bg-[#a62d18]/80" />
            <span className="absolute right-8 -top-3 h-12 w-12 rounded-full bg-white/25" />
          </>
        ) : (
          <>
            <span className="absolute right-8 -top-7 h-[76px] w-[76px] rounded-full bg-[#ffb21a]" />
            <span className="absolute right-10 -top-4 h-[58px] w-[58px] rounded-full bg-[#ff6b15]/80" />
          </>
        )}
        <h3 className="relative z-10 truncate text-[16px] font-extrabold">{title}</h3>
        <span className="relative z-10 shrink-0 rounded bg-white px-2 py-1 text-[12px] font-extrabold text-[#252525]">{stand}</span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-2.5 pb-2 pt-2">
        <p className="truncate text-[12px] leading-4 text-[#777]">{subtitle}</p>
        <div className="relative my-1.5 flex items-start justify-between">
          <div className="absolute left-[5%] right-[5%] top-[5px] h-px bg-[#d7d7d7]" />
          {stages.map((stage, index) => {
            const completed = index < completedStages;
            const current = index === completedStages && completedStages < stages.length;
            const finalStep = completed && index === stages.length - 1;

            return (
              <div key={stage} className="relative z-[1] flex w-1/4 flex-col items-center gap-0.5">
                <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[12px] font-bold ${
                  finalStep
                    ? 'border-[#11b981] bg-[#11b981] text-white'
                    : completed
                      ? 'border-[#222] bg-[#222] text-white'
                      : current
                        ? 'h-5 w-5 -mt-0.5 border-[#ff7a00] bg-white text-[#ff7a00]'
                        : 'border-[#d5d5d5] bg-white text-[#aaa]'
                }`}>
                  {completed ? '✓' : current ? index + 1 : ''}
                </span>
                <span className={`whitespace-normal text-center text-[12px] leading-tight ${current ? 'font-bold text-[#d65b00]' : finalStep ? 'font-bold text-[#11956b]' : 'text-[#777]'}`}>{stage}</span>
              </div>
            );
          })}
        </div>

        <div className={`flex min-h-[40px] items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[12px] ${
          completedStages === stages.length
            ? 'border-[#c6f2de] bg-[#edfff7] text-[#303030]'
            : 'border-[#ffe3a2] bg-[#fffaf0] text-[#303030]'
        }`}>
          <span className="truncate font-semibold">{invoice}</span>
          <button type="button" className="shrink-0 rounded border border-[#d8d8d8] bg-white px-2 py-1 text-[12px] font-medium text-[#444]">
            {action}
          </button>
        </div>
      </div>
    </article>
  );
}

function MiniEventCard({ title, date, left }: { title: string; date: string; left: number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[12px] leading-4">
      <p className="truncate text-[#333]">{title} - {date}</p>
      <span className="shrink-0 font-bold text-[#138a61]">{left} stands left</span>
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
