import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

export default function OrganizerNotificationsLink({
  disabled = false,
  confirmNavigation,
}: {
  disabled?: boolean;
  confirmNavigation?: () => boolean;
}) {
  const { unreadCount, error } = useNotifications();
  return (
    <Link
      to="/organizer/notifications"
      aria-label={error ? 'View notifications (unavailable)' : unreadCount ? `View notifications, ${unreadCount} unread` : 'View notifications'}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      title={error || 'Notifications'}
      onClick={event => {
        if (disabled || (confirmNavigation && !confirmNavigation())) event.preventDefault();
      }}
      className={`organizer-action-link relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8ZM10 19a2 2 0 0 0 4 0" />
      </svg>
      {(unreadCount > 0 || error) && (
        <span aria-hidden="true" className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
          {error ? '!' : unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
