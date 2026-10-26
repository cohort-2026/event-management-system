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
      <a href="#main-content" className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:[clip:auto] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-900 focus:shadow-lg">
        Skip to main content
      </a>
      <Navbar />

      <main id="main-content">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-neutral-950">
        <div className="page-container relative py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-14">
            <div className="text-left flex flex-col items-start">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-neutral-100 text-sm font-semibold px-4 py-2 rounded-full">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block" />
                Event Management Platform
              </div>

              <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-black !text-white leading-tight max-w-3xl tracking-tight">
                Organise events that <span className="text-accent-400">people remember.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg !text-neutral-200 max-w-xl leading-relaxed">
                One platform for creating events, managing registrations, onboarding vendors and tracking attendance — from first invite to final check-in.
              </p>

              <div className="mt-8 flex w-full flex-col sm:w-auto sm:flex-row items-stretch sm:items-center justify-start gap-3">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-accent-500 text-neutral-950 font-bold px-6 py-3 rounded-lg hover:bg-accent-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Get started free
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link to="/events" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/15 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Browse events
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/20 bg-neutral-800 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80"
                  alt="Conference attendees gathered in a bright event venue"
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

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
              <article key={f.title} className="p-6 rounded-xl border border-neutral-200 hover:border-brand-200 hover:shadow-md transition-all duration-200 group bg-white">
                <div aria-hidden="true" className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-4 text-xl group-hover:bg-brand-50 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-neutral-900 mb-1.5 tracking-tight">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="scroll-mt-20 bg-neutral-50 border-b border-neutral-100">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {[
                  ['Connected workflows', 'Events, registration, vendors and check-in in one place.'],
                  ['Role-aware tools', 'Relevant views for attendees and event teams.'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-xl bg-white border border-neutral-200 p-5 shadow-xs">
                    <span className="text-base font-bold text-brand-700">{title}</span>
                    <p className="text-sm text-neutral-600 mt-2">{description}</p>
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
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <li key={s.n} className="relative flex flex-col gap-3">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(100%-0.5rem)] w-full h-px bg-neutral-200" />
                )}
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white text-sm font-black flex items-center justify-center shrink-0">
                  {s.n}
                </div>
                <h3 className="font-bold text-neutral-900 tracking-tight">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="get-started" className="scroll-mt-20 bg-neutral-50 border-b border-neutral-100">
        <div className="page-container py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                Get started
              </span>
              <h2 className="text-3xl font-black text-neutral-900 mt-4 tracking-tight">Start planning your next event.</h2>
              <p className="text-neutral-500 mt-4 leading-relaxed">
                Explore published events or create an account to bring your event planning and attendee management into one place.
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-950 text-white p-8 shadow-xl">
              <p className="text-xs font-semibold text-neutral-300 uppercase tracking-widest mb-6">Your next step</p>
              <h3 className="text-2xl font-black tracking-tight !text-white">Ready when you are.</h3>
              <p className="text-sm !text-neutral-200 mt-3 leading-relaxed">
                Set up your account to start exploring the tools available to your role.
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
          <h2 className="text-3xl font-black !text-white tracking-tight">Ready to get started?</h2>
          <p className="!text-white max-w-md">Explore tools built for organisers, attendees, and vendors.</p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-7 py-3 rounded-lg hover:bg-brand-50 transition-colors shadow-sm">
            Create your free account
          </Link>
        </div>
      </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-neutral-200">
        <div className="page-container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-neutral-500">
          <span className="font-extrabold text-neutral-900 tracking-tight">EventMS</span>
          <span>© {new Date().getFullYear()} EventMS. All rights reserved.</span>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-5">
            <Link to="/landing#about" className="hover:text-neutral-900 transition-colors">About</Link>
            <Link to="/landing#get-started" className="hover:text-neutral-900 transition-colors">Get started</Link>
            <Link to="/events" className="hover:text-neutral-900 transition-colors">Events</Link>
            <Link to="/login" className="hover:text-neutral-900 transition-colors">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
