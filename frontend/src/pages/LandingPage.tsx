import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" strokeWidth="1.7" />
        <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3m-3 4h3m3-4h2.5m-2.5 4h2.5" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    title: "Event Management",
    desc: "Create, publish and manage workshops, training sessions, networking events and company activities from one place.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" strokeWidth="1.7" />
        <path d="M2.8 20v-1.6a6.2 6.2 0 0112.4 0V20H2.8Zm13-12.5a3.5 3.5 0 010 6.8m2.1 1.1a5.3 5.3 0 013.3 4.9V20h-3.1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Registration Tracking",
    desc: "Know exactly who is attending. Manage bookings, confirmations and cancellations with ease.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 10v10h16V10M3 10l1.5-6h15L21 10M3 10a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M9 20v-5h6v5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Vendor Applications",
    desc: "Vendors apply for stands at events. Organisers review and approve applications directly in the platform.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v2a3.5 3.5 0 000 7v2a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-2a3.5 3.5 0 000-7v-2Z" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 7.5v1m0 3v1m0 3v1" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    title: "Digital Tickets",
    desc: "Attendees receive digital tickets with unique reference numbers. Check-in is fast and paperless.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 19.5h16M6.5 16V10m5.5 6V4.5m5.5 11.5v-8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Reports & Insights",
    desc: "Management gets a clear view of attendance rates, check-in data and vendor fill-rates across all events.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M12 3.5 19 6v5.2c0 4.4-2.9 7.7-7 9.3-4.1-1.6-7-4.9-7-9.3V6l7-2.5Z" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Role-Based Access",
    desc: "Attendees, organisers, vendors, admins and management each see only what is relevant to their role.",
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

  if (user) {
    const dashboardPath: Record<string, string> = {
      ORGANIZER: "/organizer",
      VENDOR: "/vendor",
      ADMIN: "/admin",
      PLATFORM_ADMIN: "/platform-admin/settings",
      MANAGEMENT: "/management/reports",
      ATTENDEE: "/attendee",
    };

    return <Navigate to={dashboardPath[user.role] ?? "/events"} replace />;
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
        <section className="relative isolate overflow-hidden border-b border-slate-200/80 bg-[#f7f9fc] dark:border-neutral-800 dark:bg-neutral-950">
          <div className="pointer-events-none absolute -right-36 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-950/30" />
          <div className="pointer-events-none absolute -bottom-56 left-[28%] -z-10 h-[30rem] w-[30rem] rounded-full bg-cyan-100/50 blur-3xl dark:bg-cyan-950/20" />
          <div className="page-container relative py-16 sm:py-20 lg:py-24">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
              <div className="flex flex-col items-start text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-700 shadow-xs dark:border-brand-800 dark:bg-neutral-900/80 dark:text-brand-200">
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                  Event management, made simple
                </div>

                <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.6rem] dark:!text-white">
                  Great events start with{" "}
                  <span className="text-brand-600 dark:text-brand-300">a better plan.</span>
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg dark:!text-neutral-300">
                  Bring planning, registrations, vendors and check-in together
                  in one clear workspace. Spend less time coordinating and more
                  time creating events people love.
                </p>

                <div className="mt-8 flex w-full flex-col items-stretch justify-start gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-900/15 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Get started for free
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                  <Link
                    to="/events"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Browse events
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-neutral-400">
                  {["Events", "Attendees", "Vendors"].map((item) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.415-1.415l2.543 2.543 6.542-6.543a1 1 0 011.415 0Z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-2xl lg:ml-auto">
                <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-200/60 via-white to-cyan-100/70 blur-2xl dark:from-brand-950/50 dark:via-neutral-900 dark:to-cyan-950/40" />
                <div className="relative aspect-[1.12/1] overflow-hidden rounded-[1.75rem] border border-white bg-slate-200 p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 dark:border-neutral-700 dark:bg-neutral-800 dark:ring-white/10">
                  <div className="relative h-full overflow-hidden rounded-[1.25rem]">
                  <img
                    src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=80"
                    alt="Conference attendees gathered in a bright event venue"
                    className="h-full w-full object-cover"
                    fetchPriority="high"
                  />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">A seamless event experience</span>
                      <p className="mt-2 max-w-md text-xl font-bold leading-snug tracking-tight sm:text-2xl">From the first idea to the final check-in.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section
          id="features"
          className="scroll-mt-20 bg-white border-b border-neutral-100 dark:bg-neutral-950 dark:border-neutral-800"
        >
          <div className="page-container py-16 md:py-20">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
                One connected workspace
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl dark:!text-white">
                Everything in sync, from one place
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-neutral-600 dark:!text-neutral-300">
                Built for organisers, attendees, vendors and management — all in
                one place.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-slate-900/5 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:shadow-black/20"
                >
                  <div
                    aria-hidden="true"
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:group-hover:bg-brand-900"
                  >
                    {f.icon}
                  </div>
                  <h3 className="mb-2 font-bold tracking-tight text-slate-900 dark:!text-white">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-6 text-neutral-500 dark:!text-neutral-300">
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
          <div className="page-container py-16 md:py-20">
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
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-950">
                  <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.415-1.415l2.543 2.543 6.542-6.543a1 1 0 011.415 0Z" clipRule="evenodd" />
                    </svg>
                  </span>
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
        <section className="border-b border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="page-container py-16 md:py-20">
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-black text-brand-700 ring-1 ring-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-900">
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
          className="scroll-mt-20 border-b border-neutral-100 bg-[#f7f9fc] dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="page-container py-14 md:py-16">
            <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-9 dark:border-neutral-800 dark:bg-neutral-950">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">Here to help</span>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:!text-white">Let’s make your next event a success.</h2>
                <p className="mt-2 text-sm text-neutral-500 dark:!text-neutral-300">Questions about EventMS? Our team is happy to help.</p>
              </div>
              <a href="mailto:hello@eventms.com" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Email our team
              </a>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative isolate overflow-hidden bg-[#102a43]">
          <div className="pointer-events-none absolute -right-20 -top-40 -z-10 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
          <div className="page-container flex flex-col items-center gap-5 py-16 text-center md:py-20">
            <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Your next event starts here</span>
            <h2 className="text-3xl font-black tracking-tight !text-white sm:text-4xl">
              Make room for the moments that matter.
            </h2>
            <p className="max-w-md !text-slate-300">
              Bring your event team together with one simple platform.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Create your free account
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
