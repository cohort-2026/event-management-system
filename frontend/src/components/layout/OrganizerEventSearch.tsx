import { useId } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OrganizerEventSearch({ onSearch, confirmSearch, disabled = false }: {
  onSearch?: () => void;
  confirmSearch?: () => boolean;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  const inputId = useId();

  return (
    <form
      role="search"
      onSubmit={event => {
        event.preventDefault();
        const search = new FormData(event.currentTarget).get('search');
        const params = new URLSearchParams();
        if (typeof search === 'string' && search.trim()) params.set('search', search.trim());
        if (confirmSearch && !confirmSearch()) return;
        onSearch?.();
        navigate({ pathname: '/organizer/events', search: params.toString() });
      }}
      className="flex min-w-0 w-full items-center rounded-lg border border-neutral-200 bg-white focus-within:ring-2 focus-within:ring-brand-100 sm:w-[360px]"
    >
      <label htmlFor={inputId} className="sr-only">Search your events by name, venue, or category</label>
      <button type="submit" aria-label="Search events" disabled={disabled} className="p-2 text-neutral-500 hover:text-brand-700 disabled:opacity-50">
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="7" strokeWidth="2" />
          <path d="m16 16 4 4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <input
        id={inputId}
        name="search"
        type="search"
        placeholder="Search events, people..."
        disabled={disabled}
        className="min-w-0 flex-1 rounded-r-lg border-0 bg-transparent py-2 pr-3 text-sm text-neutral-900 outline-none"
      />
    </form>
  );
}
