import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#eef3f8,#eefbf6)] px-4 py-12">
      <section className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-neutral-200 p-10 text-center">
        <div className="mb-6">
          <span className="inline-flex w-20 h-20 items-center justify-center rounded-full bg-brand-50 text-brand-700 text-4xl font-black">404</span>
        </div>
        <h1 className="text-4xl font-black text-neutral-900 mb-3">Page not found</h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-7">
          The event page you are looking for may have moved or no longer exists.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="rounded-full bg-brand-700 text-white px-6 py-3 font-bold hover:bg-brand-800 transition-colors shadow-sm">
            Back to Home
          </Link>
          <Link to="/events" className="rounded-full border border-neutral-300 text-neutral-700 px-6 py-3 font-bold hover:border-brand-600 hover:text-brand-700 transition-colors">
            Browse Events
          </Link>
        </div>
      </section>
    </main>
  );
}
