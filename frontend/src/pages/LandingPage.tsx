import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { getEvents } from "@/services/eventService";
import type { Event } from "@/types/event";

const eventArtwork: Record<string, string> = {
  Technology: "from-rose-500 via-red-500 to-orange-400",
  Training: "from-emerald-500 via-teal-500 to-cyan-400",
  Networking: "from-fuchsia-600 via-pink-500 to-orange-300",
  "Company Activity": "from-orange-500 via-amber-400 to-rose-400",
};

const features = [
  {
    icon: "📅",
    title: "Event Management",
    desc: "Create, publish and manage workshops, training sessions, networking events and company activities from one place.",
  },
  {
    icon: "👥",
    title: "Registration Tracking",
    desc: "Know exactly who is attending. Manage bookings, confirmations and cancellations with ease.",
  },
  {
    icon: "🏪",
    title: "Vendor Applications",
    desc: "Vendors apply for stands at events. Organisers review and approve applications directly in the platform.",
  },
  {
    icon: "🎟",
    title: "Digital Tickets",
    desc: "Attendees receive digital tickets with unique reference numbers. Check-in is fast and paperless.",
  },
  {
    icon: "📊",
    title: "Reports & Insights",
    desc: "Administrators can review event analytics and publishing activity across the platform.",
  },
  {
    icon: "🔐",
    title: "Role-Based Access",
    desc: "Attendees, organisers, vendors and administrators each see tools relevant to their role.",
  },
];

const steps = [
  {
    n: "01",
    title: "Create an account",
    desc: "Sign up as an attendee to book events or as a vendor to apply for a stand.",
  },
  {
    n: "02",
    title: "Browse events",
    desc: "Attendees find events to join, while vendors find events with stand applications.",
  },
  {
    n: "03",
    title: "Book or apply for a stand",
    desc: "Attendees register for a spot. Vendors submit an application for an event stand.",
  },
  {
    n: "04",
    title: "Attend or exhibit",
    desc: "Attendees check in with their digital tickets, while vendors host their approved stands.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  useEffect(() => {
    let active = true;
    getEvents()
      .then(response => {
        if (active) setEvents(response.data.data);
      })
      .catch(error => {
        if (active) {
          setEventsError(axios.isAxiosError(error)
            ? error.response?.data?.message ?? "Events could not be loaded."
            : "Events could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const upcomingEvents = useMemo(() => events
    .filter(event => event.status === "PUBLISHED" && new Date(event.startTime) > new Date())
    .sort((first, second) => new Date(first.startTime).getTime() - new Date(second.startTime).getTime()), [events]);
  const eventCountLabel = eventsLoading
    ? "Find your next great day out"
    : eventsError
      ? "Explore upcoming events"
      : `${upcomingEvents.length} upcoming event${upcomingEvents.length === 1 ? "" : "s"}`;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      data-theme-scope
      className="min-h-screen flex flex-col bg-white dark:bg-neutral-950"
    >
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:[clip:auto] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar />

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="overflow-hidden bg-white dark:bg-neutral-950">
          <div className="page-container grid items-center gap-6 pb-6 pt-8 sm:gap-8 sm:pb-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-14">
            <div className="flex flex-col items-start">
                <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold !text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:!text-rose-200 dark:ring-rose-900">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-rose-500" />
                {eventCountLabel}
              </p>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-neutral-950 dark:!text-white sm:text-5xl lg:text-[3.5rem]">
                Events people actually <span className="text-rose-600">show up</span> to.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed !text-neutral-600 dark:!text-neutral-300">
                Workshops, training days and networking evenings in one place. Book in a few taps, get your ticket, and walk straight in.
              </p>
              <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link to="/events" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-rose-600 to-orange-500 px-5 text-sm font-bold !text-white shadow-sm transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
                  Browse events <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link to="/register" className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold !text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:!text-white dark:hover:bg-neutral-800">
                  Host an event
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-neutral-500 dark:!text-neutral-400">
                <Ticket aria-hidden="true" className="size-4 text-rose-600" />
                <span>Tickets, vendor stands, and event tools together.</span>
              </div>
            </div>

            <div className="relative mx-auto h-[160px] w-full max-w-[500px] sm:h-[280px] lg:h-[330px]" aria-label="Featured upcoming events">
              {upcomingEvents.slice(1, 2).map(event => <SpotlightEvent key={event.id} event={event} className="right-2 top-2 h-[140px] w-[61%] rotate-[7deg] sm:right-5 sm:top-6 sm:h-[245px] lg:top-8 lg:h-[275px]" />)}
              {upcomingEvents.slice(0, 1).map(event => <SpotlightEvent key={event.id} event={event} className="left-2 top-1 z-10 h-[150px] w-[64%] -rotate-[4deg] sm:left-4 sm:top-3 sm:h-[255px] lg:top-5 lg:h-[285px]" />)}
              {!upcomingEvents.length && !eventsLoading && (
                <div className="absolute inset-x-4 inset-y-1 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-red-500 to-orange-400 p-4 text-white shadow-xl sm:inset-x-10 sm:inset-y-5 sm:p-6">
                  <div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:repeating-radial-gradient(circle_at_80%_18%,transparent_0_13px,rgba(255,255,255,.5)_14px_16px,transparent_17px_27px)]" />
                  <div className="relative flex h-full flex-col justify-between">
                    <span className="flex size-11 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm"><CalendarDays aria-hidden="true" className="size-5" /></span>
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] !text-white/80 sm:text-xs">Make room for</p><p className="mt-1 max-w-[220px] text-lg font-black leading-tight !text-white sm:text-3xl">something worth showing up for.</p></div>
                  </div>
                </div>
              )}
              {eventsLoading && <div className="absolute inset-x-10 inset-y-5 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />}
            </div>
          </div>
        </section>

        <section id="upcoming" className="scroll-mt-20 border-t border-neutral-100 bg-[#fafaf9] py-10 dark:border-neutral-800 dark:bg-neutral-900 sm:py-12">
          <div className="page-container">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-600">Make a plan</p><h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:!text-white">Happening soon</h2></div>
              <Link to="/events" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold !text-rose-700 hover:!text-rose-800 dark:!text-rose-300">See all events <ArrowRight aria-hidden="true" className="size-4" /></Link>
            </div>
            {eventsError && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm !text-rose-800">{eventsError}</p>}
            {eventsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading upcoming events">{[0, 1, 2].map(item => <div key={item} className="h-[88px] animate-pulse rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" />)}</div>
            ) : upcomingEvents.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{upcomingEvents.slice(0, 3).map(event => <UpcomingEvent key={event.id} event={event} />)}</div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-neutral-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:bg-neutral-950">
                <p className="text-sm !text-neutral-600 dark:!text-neutral-300">{eventsError ? "Event listings are temporarily unavailable." : "No upcoming events are published yet. Check back soon."}</p>
                <Link to="/events" className="text-sm font-semibold !text-rose-700 hover:underline dark:!text-rose-300">Explore all events</Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Features ── */}
        <section
          id="features"
          className="scroll-mt-20 bg-white border-b border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800"
        >
          <div className="page-container py-20 md:py-24">
            <div className="text-center mb-14">
              <span className="inline-flex items-center rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white uppercase tracking-wide">
                Platform capabilities
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mt-5 tracking-tight dark:!text-white">
                Everything you need
              </h2>
              <p className="text-base text-neutral-600 mt-4 max-w-xl mx-auto dark:!text-neutral-300">
                Built for organisers, attendees, vendors and administrators — all in
                one place.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="p-6 rounded-xl border border-neutral-200 hover:border-brand-200 hover:shadow-md transition-all duration-200 group bg-white dark:bg-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-600"
                >
                  <div
                    aria-hidden="true"
                    className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-4 text-xl group-hover:bg-brand-50 transition-colors dark:bg-neutral-800 dark:group-hover:bg-neutral-700"
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-1.5 tracking-tight dark:!text-white">
                    {f.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed dark:!text-neutral-300">
                    {f.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── About ── */}
        <section
          id="about"
          className="scroll-mt-20 bg-neutral-50 border-b border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800"
        >
          <div className="page-container py-20 md:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white uppercase tracking-wide">
                About us
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mt-5 tracking-tight max-w-2xl dark:!text-white">
                One event, shared by everyone involved.
              </h2>
              <p className="text-base text-neutral-700 mt-5 leading-relaxed dark:!text-neutral-300">
                EventMS brings attendees, vendors, and organisers together,
                giving each a clear way to take part in an event.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-neutral-200 pt-8 dark:border-neutral-700">
              {[
                [
                  "Attendees",
                  "Find published events, reserve a spot, and check in with a digital ticket.",
                ],
                [
                  "Vendors",
                  "Discover events and apply for a stand directly through the platform.",
                ],
                [
                  "Organisers",
                  "Publish events, review vendor applications, and manage registrations and check-in.",
                ],
              ].map(([title, description]) => (
                <article id={title === "Organisers" ? "organisers" : title === "Vendors" ? "vendors" : undefined} key={title}>
                  <h3 className="text-lg font-bold text-neutral-900 dark:!text-white">
                    {title}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-2 leading-relaxed dark:!text-neutral-300">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-white border-b border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800">
          <div className="page-container py-20 md:py-24">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight dark:!text-white">
                How it works
              </h2>
              <p className="text-neutral-500 mt-3 dark:!text-neutral-300">
                From registration to check-in in four simple steps.
              </p>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((s, i) => (
                <li key={s.n} className="relative flex flex-col gap-3">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-5 left-[calc(100%-0.5rem)] w-full h-px bg-neutral-200 dark:bg-neutral-700" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-brand-600 text-white text-sm font-black flex items-center justify-center shrink-0">
                    {s.n}
                  </div>
                  <h3 className="font-bold text-neutral-900 tracking-tight dark:!text-white">
                    {s.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed dark:!text-neutral-300">
                    {s.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Contact ── */}
        <section
          id="contact"
          className="scroll-mt-20 bg-neutral-50 border-b border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800"
        >
          <div className="page-container py-20 md:py-24">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight dark:!text-white">
                Contact us
              </h2>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  { icon: "✉️", text: "hello@eventms.com" },
                  { icon: "📞", text: "+27 000 000 000" },
                ].map((contact) => (
                  <div key={contact.text} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-base shadow-xs dark:bg-neutral-800 dark:border-neutral-700"
                    >
                      {contact.icon}
                    </span>
                    <span className="text-sm font-semibold text-neutral-700 dark:!text-neutral-200">
                      {contact.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-brand-600">
          <div className="page-container py-16 flex flex-col items-center text-center gap-5">
            <h2 className="text-3xl font-black !text-white tracking-tight">
              Ready to get started?
            </h2>
            <p className="!text-white max-w-md">
              Explore tools built for organisers, attendees, and vendors.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-7 py-3 rounded-lg hover:bg-brand-50 transition-colors shadow-sm dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800">
        <div className="page-container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-neutral-500">
          <span className="font-extrabold text-neutral-900 tracking-tight dark:!text-white">
            EventMS
          </span>
          <span className="dark:!text-neutral-300">
            © {new Date().getFullYear()} EventMS. All rights reserved.
          </span>
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-5"
          >
            <Link
              to="/landing#about"
              className="hover:text-neutral-900 transition-colors dark:!text-neutral-300 dark:hover:!text-white"
            >
              About
            </Link>
            <Link
              to="/landing#contact"
              className="hover:text-neutral-900 transition-colors dark:!text-neutral-300 dark:hover:!text-white"
            >
              Contact
            </Link>
            <Link
              to="/events"
              className="hover:text-neutral-900 transition-colors dark:!text-neutral-300 dark:hover:!text-white"
            >
              Events
            </Link>
            <Link
              to="/login"
              className="hover:text-neutral-900 transition-colors dark:!text-neutral-300 dark:hover:!text-white"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SpotlightEvent({ event, className }: { event: Event; className: string }) {
  const date = new Date(event.startTime);
  const month = date.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase();
  const day = date.toLocaleDateString("en-ZA", { day: "2-digit" });
  const artwork = eventArtwork[event.category] ?? "from-orange-500 via-rose-500 to-fuchsia-500";

  return (
    <Link to={`/events/${event.id}`} aria-label={`View ${event.title}`} className={`absolute block overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${artwork} p-4 !text-white shadow-xl transition-transform hover:scale-[1.02] ${className}`}>
      {event.bannerImageUrl ? (
        <img src={event.bannerImageUrl} alt={`${event.title} banner`} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 opacity-35 [background-image:repeating-radial-gradient(circle_at_85%_12%,transparent_0_12px,rgba(255,255,255,.65)_13px_15px,transparent_16px_25px)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/75 via-neutral-950/10 to-neutral-950/5" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-md bg-white px-2 py-1 text-center text-[9px] font-bold leading-tight text-neutral-950 shadow-sm">
            {month}<span className="block text-sm">{day}</span>
          </span>
          <span className="max-w-[65%] truncate rounded-full bg-neutral-950/35 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm">{event.category}</span>
        </div>
        <div>
          <p className="line-clamp-2 text-xl font-black leading-tight text-white sm:text-2xl">{event.title}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-white/85">
            <MapPin aria-hidden="true" className="size-3 shrink-0" /><span className="truncate">{event.venue}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function UpcomingEvent({ event }: { event: Event }) {
  const date = new Date(event.startTime);
  const month = date.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase();
  const day = date.toLocaleDateString("en-ZA", { day: "2-digit" });
  const artwork = eventArtwork[event.category] ?? "from-orange-500 via-rose-500 to-fuchsia-500";

  return (
    <Link to={`/events/${event.id}`} className="group flex min-w-0 items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
      <div className={`relative flex size-[68px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br ${artwork}`}>
        {event.bannerImageUrl ? <img src={event.bannerImageUrl} alt="" className="absolute inset-0 size-full object-cover" /> : <CalendarDays aria-hidden="true" className="size-6 text-white/90" />}
        <span className="absolute left-1 top-1 rounded bg-white px-1.5 py-0.5 text-center text-[8px] font-bold leading-tight text-rose-600">
          {month}<span className="block text-xs text-neutral-950">{day}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-rose-600">
          {date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} · {date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <h3 className="mt-0.5 truncate text-sm font-bold text-neutral-950 group-hover:text-rose-700 dark:!text-white dark:group-hover:!text-rose-300">{event.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500 dark:!text-neutral-400">
          <MapPin aria-hidden="true" className="size-3 shrink-0" /> {event.venue}
        </p>
      </div>
      <p className="hidden shrink-0 text-[11px] font-medium text-neutral-600 sm:block dark:!text-neutral-300">
        {event.isFree ? "Free" : `From R${event.price ?? "—"}`}
      </p>
    </Link>
  );
}
