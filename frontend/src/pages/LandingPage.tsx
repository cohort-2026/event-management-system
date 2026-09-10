import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';

const features = [
  { icon: '📅', title: 'Event Management',      desc: 'Create, publish and manage workshops, training sessions, networking events and company activities from one place.' },
  { icon: '👥', title: 'Registration Tracking', desc: 'Know exactly who is attending. Manage bookings, confirmations and cancellations with ease.' },
  { icon: '🏪', title: 'Vendor Applications',   desc: 'Vendors apply for stands at events. Organisers review and approve applications directly in the platform.' },
  { icon: '🎟', title: 'Digital Tickets',        desc: 'Attendees receive digital tickets with unique reference numbers. Check-in is fast and paperless.' },
  { icon: '📊', title: 'Reports & Insights',     desc: 'Management gets a clear view of attendance rates, check-in data and vendor fill-rates across all events.' },
  { icon: '🔐', title: 'Role-Based Access',      desc: 'Attendees, organisers, vendors, admins and management each see only what is relevant to their role.' },
];

const steps = [
  { n: '01', title: 'Create an account',       desc: 'Register as an attendee, organiser or vendor in under a minute.' },
  { n: '02', title: 'Browse or create events', desc: 'Attendees browse published events. Organisers create and submit events for approval.' },
  { n: '03', title: 'Book your spot',          desc: 'Attendees register for events and receive a digital ticket instantly.' },
  { n: '04', title: 'Attend & check in',       desc: 'On event day, organisers scan tickets and check attendees in digitally.' },
];

const stats = [
  { value: '500+',    label: 'Events hosted' },
  { value: '12 000+', label: 'Attendees registered' },
  { value: '200+',    label: 'Vendors onboarded' },
  { value: '98%',     label: 'Check-in accuracy' },
];

export default function LandingPage() {
  const { user } = useAuth();

  if (user) {
    const dashboardPath: Record<string, string> = {
      ORGANIZER: '/organizer',
      VENDOR: '/vendor',
      ADMIN: '/admin',
      PLATFORM_ADMIN: '/platform-admin/settings',
      MANAGEMENT: '/management/reports',
      ATTENDEE: '/attendee',
    };

    return <Navigate to={dashboardPath[user.role] ?? '/events'} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-neutral-300">
        {/* Subtle grid overlay */}
        {/* <div className="absolute inset-0 opacity-[0.03]"
          // style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '30px 30px' }} /> */}
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-500 rounded-full opacity-8 blur-3xl" />

        <div className="page-container relative py-24 md:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] items-center gap-10">
            <div className="text-left flex flex-col items-start">
              <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 text-white/80 text-lg font-semibold px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block" />
                Event Management Platform
              </div>

              <h1 className="mt-7 text-5xl md:text-6xl font-black text-white leading-tight max-w-3xl tracking-tight">
                Organise events that <span className="text-brand-400">people remember.</span>
              </h1>

              <p className="mt-5 text-lg text-neutral-800 max-w-xl leading-relaxed">
                One platform for creating events, managing registrations, onboarding vendors and tracking attendance — from first invite to final check-in.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-start gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 bg-brand-400 text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-500 transition-colors shadow-lg">
                  Get started free
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link to="/events" className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/12 transition-colors">
                  Browse events
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-xl border-t border-white/12 pt-5">
                {stats.slice(0, 3).map(stat => (
                  <div key={stat.label} className="min-w-0">
                    <div className="text-2xl font-black text-white leading-none">{stat.value}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mt-2">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-brand-600/30 blur-2xl" />
              <div className="relative rounded-[2rem] border border-white/15 bg-white/8 overflow-hidden shadow-2xl">
                {/* <div className="absolute top-4 left-4 z-10 px-3 py-2 rounded-full bg-white/90 text-xs font-black uppercase tracking-wide text-brand-700 shadow-sm">
                  Today’s programme
                </div> */}
                <img
                  src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80"
                  alt="Event experience"
                  className="h-[460px] w-full object-cover"
                />
                {/* <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-neutral-950/70 border border-white/12 backdrop-blur-md p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-300">Live event</span>
                      <p className="text-white font-black text-lg mt-1">Strategy Summit 2026</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-400">28 Aug</span>
                      <span className="block text-white text-sm font-bold mt-1">09:00 — 17:00</span>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──
      <section className="bg-brand-600">
        <div className="page-container py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="text-sm font-medium text-brand-200 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* ── Features ── */}
      <section className="bg-white border-b border-neutral-100">
        <div className="page-container py-20 md:py-24">
          <div className="text-center mb-14">
            <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wide">
              Platform capabilities
            </span>
            <h2 className="text-3xl font-black text-neutral-900 mt-4 tracking-tight">Everything you need</h2>
            <p className="text-neutral-500 mt-3 max-w-xl mx-auto">Built for organisers, attendees, vendors and management — all in one place.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-neutral-200 hover:border-brand-200 hover:shadow-md transition-all duration-200 group bg-white">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-4 text-xl group-hover:bg-brand-50 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-neutral-900 mb-1.5 tracking-tight">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="bg-neutral-50 border-b border-neutral-100">
        <div className="page-container py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                About us
              </span>
              <h2 className="text-3xl font-black text-neutral-900 mt-4 tracking-tight">A smarter way to run events.</h2>
              <p className="text-neutral-500 mt-4 leading-relaxed">
                EventMS brings together organisers, attendees, vendors, and operational teams on one platform designed to make events easier to plan, promote, register, and track.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[['360°', 'Event visibility'], ['24/7', 'Operational clarity']].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-white border border-neutral-200 p-5 shadow-xs">
                    <span className="text-2xl font-black text-brand-600">{v}</span>
                    <p className="text-sm font-medium text-neutral-500 mt-1">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-neutral-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Operating model</p>
                  <h3 className="text-base font-bold text-neutral-900">Event operations</h3>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  'Plan and publish events with a clear operational workflow.',
                  'Connect registration, venue readiness, vendors, and attendance insight.',
                  'Deliver a polished experience before, during, and after every event.',
                ].map(t => (
                  <div key={t} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <p className="text-sm text-neutral-600 leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white border-b border-neutral-100">
        <div className="page-container py-20 md:py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-neutral-900 tracking-tight">How it works</h2>
            <p className="text-neutral-500 mt-3">From registration to check-in in four simple steps.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="relative flex flex-col gap-3">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(100%-0.5rem)] w-full h-px bg-neutral-200" />
                )}
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white text-sm font-black flex items-center justify-center shrink-0">
                  {s.n}
                </div>
                <h3 className="font-bold text-neutral-900 tracking-tight">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="bg-neutral-50 border-b border-neutral-100">
        <div className="page-container py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                Contact us
              </span>
              <h2 className="text-3xl font-black text-neutral-900 mt-4 tracking-tight">Let's build your next event.</h2>
              <p className="text-neutral-500 mt-4 leading-relaxed">
                Speak with our team about your event goals, vendor requirements, public registrations, staff coordination, and operational planning.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  { icon: '✉️', text: 'hello@eventms.com' },
                  { icon: '📞', text: '+27 000 000 000' },
                ].map(c => (
                  <div key={c.text} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-base shadow-xs">{c.icon}</span>
                    <span className="text-sm font-semibold text-neutral-700">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-950 text-white p-8 shadow-xl">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-6">Request a consultation</p>
              <h3 className="text-2xl font-black tracking-tight">Tell us about your event.</h3>
              <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
                Our team will help you plan the right registration flow, vendor setup, and attendee experience.
              </p>
              <Link to="/register" className="inline-flex items-center gap-2 mt-8 bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-500 transition-colors">
                Create an account
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-brand-600">
        <div className="page-container py-16 flex flex-col items-center text-center gap-5">
          <h2 className="text-3xl font-black text-white tracking-tight">Ready to get started?</h2>
          <p className="text-brand-200 max-w-md">Join teams already powering their events with EventMS.</p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-7 py-3 rounded-lg hover:bg-brand-50 transition-colors shadow-sm">
            Create your free account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-neutral-200">
        <div className="page-container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-neutral-400">
          <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
          <span>© {new Date().getFullYear()} EventMS. All rights reserved.</span>
          <div className="flex gap-5">
            <Link to="/events" className="hover:text-neutral-600 transition-colors">Events</Link>
            <Link to="/login"  className="hover:text-neutral-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
