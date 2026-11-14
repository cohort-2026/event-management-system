import { Link } from 'react-router-dom';

export default function OrganizerNotificationsLink({
  inverse = false,
  disabled = false,
  confirmNavigation,
}: {
  inverse?: boolean;
  disabled?: boolean;
  confirmNavigation?: () => boolean;
}) {
  return (
    <Link
      to="/organizer/notifications"
      aria-label="View notifications"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      title="Notifications"
      onClick={event => {
        if (disabled || (confirmNavigation && !confirmNavigation())) event.preventDefault();
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        inverse
          ? 'border-white/40 text-white hover:bg-white/10 focus-visible:outline-white'
          : 'border-current text-current hover:opacity-70 focus-visible:outline-current'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8ZM10 19a2 2 0 0 0 4 0" />
      </svg>
    </Link>
  );
}
