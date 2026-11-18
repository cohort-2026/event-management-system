import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import VendorSidebar from '@/components/layout/VendorSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import VendorSearchField from '@/components/layout/VendorSearchField';
import { getEvents } from '@/services/eventService';
import { getMyApplications } from '@/services/vendorService';
import type { Event } from '@/types/event';
import type { VendorApplication } from '@/types/vendor';

const bannerThemes = [
  'bg-gradient-to-br from-[#ff8c63] via-[#f14b2d] to-[#f97316]',
  'bg-gradient-to-br from-[#171717] via-[#25211f] to-[#342823]',
  'bg-gradient-to-br from-[#111116] via-[#75152e] to-[#29101b]',
  'bg-gradient-to-br from-[#9b25eb] via-[#d332a4] to-[#ec4c89]',
  'bg-gradient-to-br from-[#0f9b78] via-[#0d957a] to-[#089a8c]',
  'bg-gradient-to-br from-[#bcbcbc] via-[#a5a5a5] to-[#888]',
];

export default function EventList() {
  const { pathname } = useLocation();
  const isVendorEventsPage = pathname === '/vendor/events';
  const [events, setEvents] = useState<Event[]>([]);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'standsAvailable' | 'thisMonth' | 'gauteng' | 'foodAndDrink' | null>('standsAvailable');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicationError, setApplicationError] = useState('');

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (active) setEvents(response.data.data ?? []);
      })
      .catch(loadError => {
        if (active) {
          setError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Events could not be loaded.')
            : 'Events could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isVendorEventsPage) return;

    let active = true;
    getMyApplications()
      .then(response => {
        if (active) setApplications(response.data.data ?? []);
      })
      .catch(loadError => {
        if (active) {
          setApplicationError(axios.isAxiosError(loadError)
            ? (loadError.response?.data?.message ?? 'Your applications could not be loaded.')
            : 'Your applications could not be loaded.');
        }
      });

    return () => { active = false; };
  }, [isVendorEventsPage]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const gautengLocations = /\b(gauteng|johannesburg|joburg|pretoria|tshwane|sandton|soweto|midrand|centurion|randburg|roodepoort|kempton park|benoni|boksburg|germiston|alberton|springs|east rand)\b/i;
    const foodAndDrinkTerms = /\b(food|drink|catering|caterer|cuisine|restaurant|beverage|culinary)\b/i;

    return events.filter(event => {
      const searchableText = [event.title, event.venue, event.category, event.description].join(' ');
      const eventDate = new Date(event.startTime);
      return (!query || searchableText.toLowerCase().includes(query))
        && (activeFilter !== 'standsAvailable' || event.availableVendorStands > 0)
        && (activeFilter !== 'thisMonth' || (eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()))
        && (activeFilter !== 'gauteng' || gautengLocations.test(event.venue))
        && (activeFilter !== 'foodAndDrink' || foodAndDrinkTerms.test([event.title, event.category, event.description].join(' ')));
    });
  }, [events, activeFilter, search]);

  const toggleFilter = (filter: NonNullable<typeof activeFilter>) => {
    setActiveFilter(current => current === filter ? null : filter);
  };

  const applicationsByEvent = new Map(applications.map(application => [application.eventId, application]));

  return (
    <PageWrapper>
      <div className="vendor-events-page min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="flex min-h-screen">
          <VendorSidebar />

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-11 items-center justify-between border-b border-[#e7e7e7] bg-white px-4">
              <span className="text-[12px] font-semibold text-[#333]">Find events</span>
              <div className="flex items-center gap-2">
                <VendorSearchField />
                <NotificationBell appearance="header" />
              </div>
            </header>

            <main className="px-3.5 pb-4 pt-4">
              <h1 className="mb-2 text-[22px] font-extrabold leading-7 tracking-tight text-[#151515]">Events looking for vendors</h1>

              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <label className="flex h-[21px] w-full items-center gap-1.5 rounded-md border border-[#dedede] bg-white px-2 text-[#777] sm:w-[171px]">
                  <SearchIcon />
                  <input
                    aria-label="Search events"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search events"
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-[#333] outline-none placeholder:text-[#999] focus:ring-0"
                  />
                </label>
                <FilterChip label="Stands available" active={activeFilter === 'standsAvailable'} onClick={() => toggleFilter('standsAvailable')} />
                <FilterChip label="This month" active={activeFilter === 'thisMonth'} onClick={() => toggleFilter('thisMonth')} />
                <FilterChip label="Gauteng" active={activeFilter === 'gauteng'} onClick={() => toggleFilter('gauteng')} />
                <FilterChip label="Food & drink allowed" active={activeFilter === 'foodAndDrink'} onClick={() => toggleFilter('foodAndDrink')} />
              </div>

              {error && <p role="alert" className="mb-2 text-[13px] font-medium text-[#c62828]">{error}</p>}
              {applicationError && <p role="alert" className="mb-2 text-[13px] font-medium text-[#c62828]">{applicationError}</p>}

              {loading ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="h-[170px] animate-pulse rounded-lg border border-[#e5e5e5] bg-white" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 text-center">
                  <p className="text-[14px] font-semibold text-[#333]">No events found.</p>
                  <p className="mt-1 text-[13px] text-[#777]">Try another search.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  {filteredEvents.map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant={index % bannerThemes.length}
                      application={applicationsByEvent.get(event.id)}
                    />
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function EventCard({
  event,
  variant,
  application,
}: {
  event: Event;
  variant: number;
  application?: VendorApplication;
}) {
  const eventDate = new Date(event.startTime);
  const month = eventDate.toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase();
  const day = eventDate.toLocaleDateString('en-ZA', { day: '2-digit' });
  const isApplied = Boolean(application);
  const applicationLabel = application?.status === 'PENDING_REVIEW'
    ? 'Applied · under review'
    : application?.status === 'APPROVED'
      ? 'Applied · approved'
      : 'Applied · rejected';

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
      <div className={`relative h-[68px] overflow-hidden ${bannerThemes[variant]}`}>
        {event.bannerImageUrl ? (
          <img src={event.bannerImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <EventArtwork variant={variant} />
        )}
        <div className="absolute left-1 top-1 flex h-[23px] w-[23px] flex-col items-center justify-center rounded-md bg-white text-[#222] shadow-sm">
          <span className="text-[10px] font-bold leading-3 text-[#e11d48]">{month}</span>
          <span className="text-[14px] font-extrabold leading-4">{day}</span>
        </div>
      </div>

      <div className="p-2">
        <h2 className="truncate text-[14px] font-extrabold leading-4 text-[#202020]">{event.title}</h2>
        <p className="mt-0.5 truncate text-[12px] leading-[10px] text-[#777]">
          {event.venue} · {event.capacity.toLocaleString()} attendees expected
        </p>

        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-[#f7f7f7] px-2 py-1.5">
          <div>
            <p className="text-[10px] leading-3 text-[#777]">Stands left</p>
            <p className="text-[12px] font-bold leading-[10px] text-[#333]">
              {event.availableVendorStands} of {event.vendorStandsAvailable}
            </p>
          </div>
          <div>
            <p className="text-[10px] leading-3 text-[#777]">Rate</p>
            <p className="text-[12px] font-bold leading-[10px] text-[#333]">
              R{event.vendorStandRatePerSqm.toLocaleString('en-ZA')}/m²
            </p>
          </div>
        </div>

        {isApplied ? (
          <div className="mt-1.5 flex h-[21px] items-center justify-center rounded-md border border-[#ffe3a2] bg-[#fff9e8] text-[12px] font-bold text-[#c96a00]">
            {applicationLabel}
          </div>
        ) : event.availableVendorStands <= 0 ? (
          <div className="mt-1.5 flex h-[21px] items-center justify-center rounded-md bg-[#f1f1f1] text-[12px] font-semibold text-[#888]">
            All stands taken
          </div>
        ) : (
          <Link
            to={`/vendor/events/${event.id}/apply`}
            className="mt-1.5 flex h-[21px] items-center justify-center rounded-md bg-[#111] text-[12px] font-bold text-white transition hover:bg-[#333]"
          >
            Apply for a stand
          </Link>
        )}
      </div>
    </article>
  );
}

function EventArtwork({ variant }: { variant: number }) {
  if (variant === 0) {
    return (
      <>
        <span className="absolute -left-5 top-6 h-16 w-16 rounded-full bg-[#ffb45c]" />
        <span className="absolute left-[27%] top-8 h-20 w-20 rounded-full bg-[#ad2c18]/75" />
        <span className="absolute right-2 -top-5 h-12 w-12 rounded-full bg-[#ffb46b]/70" />
      </>
    );
  }
  if (variant === 1) {
    return <span className="absolute left-1/2 top-7 h-20 w-20 -translate-x-1/2 rounded-full bg-[#ff7900]" />;
  }
  if (variant === 2) {
    return <span className="absolute -right-4 -top-7 h-24 w-24 rounded-full bg-[#961532]/90 blur-sm" />;
  }
  if (variant === 3) {
    return <span className="absolute inset-0 opacity-70" style={{ backgroundImage: 'repeating-radial-gradient(circle at 16% 80%, transparent 0 5px, rgb(255 255 255 / 0.24) 6px 8px)' }} />;
  }
  if (variant === 4) {
    return (
      <>
        <span className="absolute -left-2 -top-6 h-12 w-12 rounded-full bg-[#86d35b]" />
        <span className="absolute right-4 top-5 h-14 w-14 rounded-full bg-[#45b6a4]" />
      </>
    );
  }
  return (
    <>
      <span className="absolute right-5 -top-4 h-14 w-14 rounded-full bg-white/60" />
      <span className="absolute left-10 top-8 h-7 w-7 rounded-full bg-white/35" />
    </>
  );
}

function FilterChip({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-[21px] shrink-0 items-center rounded-full border px-2 text-[12px] font-semibold transition ${
        active
          ? 'border-[#171717] bg-[#171717] text-white'
          : 'border-[#e2e2e2] bg-white text-[#444] hover:bg-[#f5f5f5]'
      }`}
    >
      {label}
    </button>
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
