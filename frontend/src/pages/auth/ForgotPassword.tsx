import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#eef3f8,#eefbf6)] px-4 py-12">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-200 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-700 text-white flex items-center justify-center shadow-md mx-auto mb-6">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM5 20a7 7 0 0114 0" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-neutral-900 mb-2">Reset password</h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-7">
          Password recovery is ready for your event platform flow.
        </p>
        <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-brand-700 text-white px-6 py-3 font-bold hover:bg-brand-800 transition-colors shadow-sm">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
