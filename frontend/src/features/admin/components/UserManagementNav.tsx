import { Link } from 'react-router-dom';

export default function UserManagementNav() {
  return (
    <section className="mb-8">
      
      <nav aria-label="User profiles" className="flex flex-wrap gap-3">
        <Link
          to="/admin/users/organizers/pending"
          className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          ORGANIZER PROFILE AWAITING APPROVAL
        </Link>
        <Link
          to="/admin/users/vendors/pending"
          className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          VENDOR PROFILES AWAITING APPROVAL
        </Link>
      </nav>
    </section>
  );
}
