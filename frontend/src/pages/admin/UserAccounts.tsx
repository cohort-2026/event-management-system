import { Link } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';

export default function UserAccounts() {
  return (
    <PageWrapper>
      <section className="mb-8">
        <h1 className="mb-3 text-2xl font-bold text-neutral-900">User Accounts</h1>
        <nav aria-label="Approved user profiles" className="flex flex-wrap gap-3">
          <Link
            to="/admin/users/organizers"
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            ORGANIZER PROFILES
          </Link>
          <Link
            to="/admin/users/vendors"
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            VENDOR PROFILES
          </Link>
        </nav>
      </section>
    </PageWrapper>
  );
}
