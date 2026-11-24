import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, CalendarDays, MapPin, Search, Ticket, Users } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { getEvents } from "@/features/events/services/eventService";
import type { Event } from "@/types/event";
import { EventCard } from "@/components/shared";

export default function LandingPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getEvents().then(response => { if (active) setEvents(response.data.data ?? []); })
      .catch(reason => { if (active) setError(axios.isAxiosError(reason) ? reason.response?.data?.message ?? "Events could not be loaded." : "Events could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const upcoming = useMemo(() => events.filter(event => event.status === "PUBLISHED" && new Date(event.endTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()), [events]);
  const categories = [...new Set(upcoming.map(event => event.category))];
  if (user) return <Navigate to="/" replace />;
  return <main className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white">
    <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(249,115,22,.25),transparent_38%),radial-gradient(ellipse_at_10%_90%,rgba(225,29,72,.2),transparent_36%)]" />
      <div className="page-container grid min-h-[520px] items-center gap-12 py-16 md:grid-cols-[1.05fr_.95fr] md:py-24">
        <div><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-orange-200"><CalendarDays className="size-4" /> Discover what’s happening</p>
          <h1 className="max-w-2xl font-heading text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl">Make plans worth <span className="text-orange-400">showing up for.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">Find workshops, training, networking and more. Book your place and keep every ticket together.</p>
          <form action="/events" className="mt-8 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-xl" role="search"><label className="flex min-w-0 flex-1 items-center gap-3 px-3 text-neutral-400"><Search className="size-5 shrink-0"/><input name="search" placeholder="Search events or venues" aria-label="Search events or venues" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400" /></label><button className="rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600">Search</button></form>
          <div className="mt-5 flex flex-wrap gap-3"><Link to="/events" className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600">Explore events <ArrowRight className="size-4" /></Link><Link to="/for/organisers" className="inline-flex h-11 items-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">Host an event</Link></div>
        </div>
        <div className="relative hidden min-h-[350px] items-center justify-center md:flex" aria-hidden="true"><div className="absolute h-72 w-72 rounded-full bg-orange-500/20 blur-3xl"/><div className="relative grid w-full max-w-md grid-cols-2 gap-4">{upcoming.slice(0, 4).map((event, index) => <Link key={event.id} to={`/events/${event.id}`} className={`group relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-white/15 bg-neutral-800 p-4 shadow-2xl ${index % 2 ? "translate-y-8" : "-translate-y-2"}`}>{event.bannerImageUrl && <img src={event.bannerImageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-65 transition group-hover:scale-105"/>}<span className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 to-transparent"/><span className="relative text-xs text-orange-200">{event.category}</span><strong className="relative mt-1 line-clamp-2 font-heading text-lg">{event.title}</strong><span className="relative mt-2 flex items-center gap-1 text-xs text-neutral-200"><MapPin className="size-3"/>{event.venue}</span></Link>)}</div></div>
      </div>
    </section>
    <section className="page-container py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-orange-600">Your next plan</p><h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Upcoming events</h2><p className="mt-2 text-neutral-600 dark:text-neutral-300">Explore what’s coming up and find your place.</p></div><Link to="/events" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-900 hover:text-orange-600 dark:text-white">All events <ArrowRight className="size-4"/></Link></div>
      {loading ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(n=><div key={n} className="h-72 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800"/>)}</div> : error ? <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error} <button className="ml-2 font-bold underline" onClick={()=>window.location.reload()}>Retry</button></div> : upcoming.length ? <div className="card-grid mt-8">{upcoming.slice(0,3).map(event=><EventCard key={event.id} event={event}/>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-600">No upcoming events are listed right now. Check back soon.</div>}
    </section>
    {categories.length > 0 && <section className="border-y border-neutral-200 bg-stone-50 py-14 dark:border-neutral-800 dark:bg-neutral-900"><div className="page-container"><div className="mb-6"><h2 className="font-heading text-2xl font-bold">Browse by category</h2><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Categories from currently published events.</p></div><div className="flex flex-wrap gap-3">{categories.map(category=><Link key={category} to={`/events?category=${encodeURIComponent(category)}`} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:border-orange-300 hover:text-orange-700 dark:border-neutral-700 dark:bg-neutral-950">{category}</Link>)}</div></div></section>}
    <section className="page-container grid gap-8 py-16 md:grid-cols-3"><Step icon={<Search/>} title="Find your event" text="Browse the published events and choose what suits you."/><Step icon={<Ticket/>} title="Book your place" text="Choose a ticket type and complete the existing booking flow."/><Step icon={<Users/>} title="Keep it together" text="See your bookings and individual tickets in your attendee space."/></section>
    <footer className="border-t border-neutral-200 bg-white py-8 dark:border-neutral-800 dark:bg-neutral-950"><div className="page-container flex flex-col items-center justify-between gap-4 text-sm text-neutral-500 sm:flex-row"><span>© {new Date().getFullYear()} EventMS</span><div className="flex gap-5"><Link to="/events" className="hover:text-orange-600">Explore events</Link><Link to="/login" className="hover:text-orange-600">Sign in</Link><Link to="/register" className="hover:text-orange-600">Create account</Link></div></div></footer>
  </main>;
}
function Step({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"><span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">{icon}</span><h3 className="font-heading text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{text}</p></div> }
