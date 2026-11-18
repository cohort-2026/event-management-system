<<<<<<< HEAD
const rows = [
  {
    name: 'Thandi Nkosi',
    email: 'thandi.nkosi@example.co.za',
    ticket: 'Community pass',
    reference: 'EVT-7K2Q9M',
    booked: '1 Nov, 09:02',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'TN',
    avatarClass: 'bg-[#d9b6d4] text-[#5f2d4d]',
  },
  {
    name: 'Ayesha Patel',
    email: 'ayesha.patel@example.co.za',
    ticket: 'VIP',
    reference: 'EVT-2HX7RB',
    booked: '1 Nov, 09:15',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'AP',
    avatarClass: 'bg-[#f4d2a3] text-[#7c4a0d]',
  },
  {
    name: 'Johan Meyer',
    email: 'johan.meyer@example.co.za',
    ticket: 'Early bird',
    reference: 'EVT-9PW2KD',
    booked: '3 Nov, 18:40',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'JM',
    avatarClass: 'bg-[#c1d9d4] text-[#2a4d4a]',
  },
  {
    name: 'Lindiwe Mthembu',
    email: 'lindiwe.m@example.co.za',
    ticket: 'General',
    reference: 'EVT-4T0N8V',
    booked: '5 Nov, 12:21',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'LM',
    avatarClass: 'bg-[#f2bfe0] text-[#6b2c57]',
  },
  {
    name: 'Pieter van der Merwe',
    email: 'pieter.vdm@example.co.za',
    ticket: 'General',
    reference: 'EVT-BMC3YJ',
    booked: '6 Nov, 08:03',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'PV',
    avatarClass: 'bg-[#d9c7f0] text-[#3a2f61]',
  },
  {
    name: 'Nandi Zulu',
    email: 'nandi.zulu@example.co.za',
    ticket: 'Community pass',
    reference: 'EVT-6RF1GA',
    booked: '8 Nov, 21:47',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'NZ',
    avatarClass: 'bg-[#f5cbba] text-[#6f3d2d]',
  },
  {
    name: 'Rajesh Nair',
    email: 'rajesh.nair@example.co.za',
    ticket: 'VIP',
    reference: 'EVT-3LB5SE',
    booked: '9 Nov, 10:30',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'RN',
    avatarClass: 'bg-[#d8dfaa] text-[#3c4b1d]',
  },
  {
    name: 'Bongani Khumalo',
    email: 'bongani.k@example.co.za',
    ticket: 'General',
    reference: 'EVT-SZN9Q0',
    booked: '10 Nov, 07:55',
    status: 'Confirmed',
    checkedIn: '',
    avatar: 'BK',
    avatarClass: 'bg-[#cfe1f0] text-[#2d4666]',
  },
];

const pillClasses = {
  confirmed: 'bg-[#dfeee8] text-[#2d8f68]',
  waitlisted: 'bg-[#f7f1dc] text-[#b17a1d]',
  cancelled: 'bg-[#f5dfe0] text-[#b73d4d]',
};
=======
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '@/components/layout/PageWrapper';
import { DashboardHeader } from '@/components/layout/DashboardSidebar';
import OrganizerSidebar from '@/components/layout/OrganizerSidebar';
import Spinner from '@/components/ui/Spinner';
import { getEventRegistrations } from '@/services/eventService';
import type { EventRegistration } from '@/services/eventService';
>>>>>>> 1dbe4e6e8c715cd663993991822876ac62db5dfa

export default function EventRegistrations() {
  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#edf1f4] px-2 py-3 text-[#1f2937] antialiased sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1280px] overflow-hidden rounded-[18px] border border-[#dfe5eb] bg-[#f4f5f3] shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <div className="flex h-12 items-center gap-3 border-b border-[#e4e7eb] bg-[#f2f4f5] px-4">
          <div className="flex items-center gap-2 text-[#7d8695]">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#fbbf24] text-[8px]">•</span>
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#34d399] text-[8px]">•</span>
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#f87171] text-[8px]">•</span>
          </div>
          <div className="ml-2 flex h-7 flex-1 items-center rounded-md border border-[#dfe3ea] bg-white px-3 text-[12px] text-[#6b7280] shadow-inner shadow-[#f3f4f6]">
            <GlobeIcon />
            <span className="ml-2 truncate">events.app/organizer/events/jts-2026/registrations</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280]">
              <BellIcon />
            </button>
          </div>
        </div>

        <div className="flex min-h-[720px] flex-col lg:flex-row">
          <aside className="w-full border-b border-[#e5e7eb] bg-[#f7f8f8] px-3 py-4 lg:w-[220px] lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-[#f3f4f5] px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f15d5d] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                E
              </div>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#f15d5d]">EventMS</div>
              </div>
=======
    <PageWrapper appearance="light">
      <div className="flex flex-col lg:flex-row">
        <OrganizerSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardHeader title="Event registrations" subtitle="Attendees and ticket status for your event" breadcrumbs={[{ label: 'My events', to: '/organizer/events' }, { label: 'Registrations' }]} />
          {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {loading ? <div className="flex justify-center py-16"><Spinner /></div> : registrations.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
              <h2 className="font-bold text-neutral-900">No registrations yet</h2>
              <p className="mt-2 text-sm text-neutral-600">Attendee bookings will appear here.</p>
              <Link to="/organizer/events" className="mt-4 inline-block text-sm font-semibold text-brand-700">Back to my events</Link>
>>>>>>> 1dbe4e6e8c715cd663993991822876ac62db5dfa
            </div>

            <nav className="grid grid-cols-2 gap-1.5 pt-3 text-[14px] sm:grid-cols-3 lg:block lg:space-y-1.5">
              <NavItem label="Overview" active={false} icon={<OverviewIcon />} />
              <NavItem label="My events" active={true} icon={<EventsIcon />} />
              <NavItem label="Create event" active={false} icon={<PlusIcon />} />
              <NavItem label="Reports" active={false} icon={<ChartIcon />} />
              <NavItem label="Notifications" active={false} icon={<BellIcon />} />
              <NavItem label="Organisation profile" active={false} icon={<ProfileIcon />} />
            </nav>

            <div className="mt-auto pt-8">
              <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5c2ae] text-[13px] font-bold text-[#7a3e2a]">LM</div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#1f2937]">Lerato Mokoena</div>
                  <div className="truncate text-[12px] text-[#6b7280]">Jez Dov Collective</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 bg-[#f7f7f6] p-3 sm:p-5">
            <div className="rounded-[18px] bg-[#f7f7f6] px-2 pb-2 pt-1">
              <div className="mb-5 flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#8a8f9b]">
                <span className="cursor-pointer hover:text-[#374151]">My events</span>
                <span>/</span>
                <span>Joburg Tech Summit 2026</span>
                <span>/</span>
                <span className="text-[#374151]">Guest list</span>
              </div>

              <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#1f2937] sm:text-[34px]">Guest list</h1>
                  <p className="mt-1 text-[15px] font-medium text-[#6b7280]">Joburg Tech Summit 2026 • Thu 3 Dec</p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 pt-1 sm:w-auto">
                  <ActionButton variant="secondary" label="Message guests" icon={<MessageIcon />} />
                  <ActionButton variant="secondary" label="Export CSV" icon={<DownloadIcon />} />
                  <ActionButton variant="primary" label="Check-in" icon={<CheckInIcon />} />
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill active label="Confirmed" count={284} />
                  <Pill label="Checked in" count={0} />
                  <Pill label="Waitlist" count={18} />
                  <Pill label="Cancelled" count={9} />
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]">
                    <SearchIcon />
                  </span>
                  <input
                    aria-label="Guest search"
                    value=""
                    placeholder="Name, email or EVT..."
                    className="h-10 w-full rounded-lg border border-[#dfe3ea] bg-white pl-9 pr-3 text-[14px] text-[#2a313d] placeholder:text-[#9aa3af] focus:border-[#bac4d2] focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <select
                    aria-label="Ticket type filter"
                    defaultValue="all"
                    className="h-10 appearance-none rounded-lg border border-[#dfe3ea] bg-white px-3 pr-8 text-[14px] text-[#374151] focus:border-[#bac4d2] focus:outline-none"
                  >
                    <option value="all">All ticket types</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]">
                    <ChevronDownIcon />
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[12px] border border-[#e3e7ec] bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                <table className="min-w-[700px] border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr className="bg-[#f5f6f7] text-left text-[12px] font-semibold uppercase tracking-[0.02em] text-[#737d8a]">
                      <th className="px-4 py-3">Guest</th>
                      <th className="px-4 py-3">Ticket type</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Booked</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Checked in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.email} className={index % 2 === 0 ? 'bg-white' : 'bg-[#fafafb]'}>
                        <td className="border-t border-[#edf0f2] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${row.avatarClass}`}>
                              {row.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-[#1f2937]">{row.name}</div>
                              <div className="text-[12px] text-[#6b7280]">{row.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border-t border-[#edf0f2] px-4 py-3 text-[#374151]">{row.ticket}</td>
                        <td className="border-t border-[#edf0f2] px-4 py-3 font-medium text-[#374151]">{row.reference}</td>
                        <td className="border-t border-[#edf0f2] px-4 py-3 text-[#6b7280]">{row.booked}</td>
                        <td className="border-t border-[#edf0f2] px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${pillClasses.confirmed}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="border-t border-[#edf0f2] px-4 py-3 text-[#7a7f8a]">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#7c818b]">
                <div>Showing 1-8 of 284</div>
                <div className="flex items-center gap-2">
                  <button type="button" className="h-8 min-w-[72px] rounded-md border border-[#dfe3ea] bg-white px-3 font-medium text-[#374151] shadow-sm">
                    Previous
                  </button>
                  <button type="button" className="h-8 min-w-[72px] rounded-md border border-[#dfe3ea] bg-white px-3 font-medium text-[#374151] shadow-sm">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD

function NavItem({ label, active, icon }: { label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-[#f3e3ea] text-[#1f2937] shadow-inner shadow-[#f3d4e0]' : 'text-[#525a67] hover:bg-[#eef1f4]'
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center ${active ? 'text-[#d14f74]' : 'text-[#6b7280]'}`}>{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ActionButton({ variant, label, icon }: { variant: 'primary' | 'secondary'; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className={
        variant === 'primary'
          ? 'inline-flex items-center gap-2 rounded-lg bg-[#1f2937] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[#111827]'
          : 'inline-flex items-center gap-2 rounded-lg border border-[#dfe3ea] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm hover:bg-[#f9fafb]'
      }
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

function Pill({ label, active = false, count }: { label: string; active?: boolean; count?: number }) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
        active
          ? 'border-[#1f2937] bg-[#1f2937] text-white'
          : 'border-[#dfe3ea] bg-white text-[#4b5563] hover:bg-[#f7f8fa]'
      }`}
    >
      {count !== undefined ? `${label} ${count}` : label}
    </button>
  );
}

function OverviewIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function EventsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M5 18V9m7 9V5m7 13v-8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProfileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 1 1 14 0" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MessageIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M5 11.5A7.5 7.5 0 0 1 12.5 4H18a2 2 0 0 1 2 2v7.5A7.5 7.5 0 0 1 12.5 21H8l-3 3v-3.5A7.5 7.5 0 0 1 5 11.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 4v10m0 0 4-4m-4 4-4-4M4 18h16" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CheckInIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M5 12.5 9.5 17 19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>;
}

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" strokeLinecap="round" /></svg>;
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
=======
>>>>>>> 1dbe4e6e8c715cd663993991822876ac62db5dfa
