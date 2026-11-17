import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getEvents } from "@/services/eventService";
import type { Event } from "@/types/event";

const eventArtwork: Record<string, string> = {
  Technology: "from-rose-500 via-red-500 to-orange-400",
  Training: "from-emerald-500 via-teal-500 to-cyan-400",
  Networking: "from-fuchsia-600 via-pink-500 to-orange-300",
  "Company Activity": "from-orange-500 via-amber-400 to-rose-400",
};

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

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:[clip:auto] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <main id="main-content" className="min-h-0 flex-1">
        <section className="flex h-full items-center overflow-hidden bg-white dark:bg-neutral-950">
          <div className="page-container grid items-center gap-5 py-5 sm:gap-8 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-8">
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
                <Link to="/for/organisers" className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-semibold !text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:!text-white dark:hover:bg-neutral-800">
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
      </main>
      <footer className="mt-auto border-t border-neutral-200 bg-white py-5 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="page-container text-center text-xs text-neutral-500 dark:text-neutral-400">
          © {new Date().getFullYear()} EventMS. All rights reserved.
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
