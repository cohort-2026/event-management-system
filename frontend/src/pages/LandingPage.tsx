import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import Navbar from "@/components/layout/Navbar";

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
        <section className="relative overflow-hidden bg-neutral-950">
          <div className="page-container relative py-16 sm:py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-14">
              <div className="text-left flex flex-col items-start">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-neutral-100 text-sm font-semibold px-4 py-2 rounded-full">
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block"
                  />
                  Event Management Platform
                </div>

                <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-black !text-white leading-tight max-w-3xl tracking-tight">
                  Organise events that{" "}
                  <span className="text-accent-400">people remember.</span>
                </h1>

                <p className="mt-5 text-base sm:text-lg !text-neutral-200 max-w-xl leading-relaxed">
                  One platform for creating events, managing registrations,
                  onboarding vendors and tracking attendance — from first invite
                  to final check-in.
                </p>

                <div className="mt-8 flex w-full flex-col sm:w-auto sm:flex-row items-stretch sm:items-center justify-start gap-3">
                  <a
                    href="#features"
                    className="inline-flex items-center justify-center gap-2 bg-accent-500 text-neutral-950 font-bold px-6 py-3 rounded-lg hover:bg-accent-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Explore features
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
                  </a>
                  <Link
                    to="/events"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/15 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
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
                <article key={title}>
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
