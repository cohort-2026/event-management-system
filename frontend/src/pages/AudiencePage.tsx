import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CalendarCheck, Store, Users } from "lucide-react";

const audiences = {
  attendees: {
    eyebrow: "For attendees",
    title: "Find your next event and make it a day to remember.",
    description: "Explore workshops, training sessions, and networking events. Book your place and keep your digital tickets together.",
    action: "Browse events",
    actionTo: "/events",
    icon: CalendarCheck,
    benefits: ["Discover published events in one place", "Reserve your spot online", "Keep your event tickets ready for check-in"],
  },
  organisers: {
    eyebrow: "For organisers",
    title: "Bring your event together in one place.",
    description: "Publish events, manage attendee registrations, review vendor applications, and keep check-in organised.",
    action: "Create events",
    actionTo: "/login",
    icon: Users,
    benefits: ["Create and publish event listings", "Track registrations and confirmations", "Review vendor applications and manage check-in"],
  },
  vendors: {
    eyebrow: "For vendors",
    title: "Find the right events for your business.",
    description: "Browse published events with available vendor stands without an account. Create a vendor account when you are ready to apply.",
    action: "Browse events",
    actionTo: "/events?stands=available",
    icon: Store,
    benefits: ["Discover events accepting vendor applications", "Create an account to apply for a stand", "Keep track of your applications"],
  },
} as const;

export default function AudiencePage() {
  const { audience } = useParams();
  const content = audience && audience in audiences ? audiences[audience as keyof typeof audiences] : null;
  if (!content) return <Navigate to="/missing-page" replace />;

  const Icon = content.icon;
  return (
    <div className="min-h-screen bg-white">
      <main className="page-container pb-16 pt-4 sm:pb-24 sm:pt-6">
        <section className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-rose-600">{content.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-neutral-950 sm:text-6xl">{content.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">{content.description}</p>
          <Link to={content.actionTo} className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-rose-600 to-orange-500 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
            {content.action}<ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {content.benefits.map((benefit, index) => (
              <article key={benefit} className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  {index === 0 ? <Icon aria-hidden="true" className="size-5" /> : <span className="text-sm font-black">0{index + 1}</span>}
                </span>
                <h2 className="mt-5 text-base font-bold leading-snug text-neutral-900">{benefit}</h2>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
