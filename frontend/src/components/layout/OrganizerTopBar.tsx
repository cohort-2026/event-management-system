import OrganizerEventSearch from '@/components/layout/OrganizerEventSearch';
import OrganizerNotificationsLink from '@/components/layout/OrganizerNotificationsLink';

export default function OrganizerTopBar({
  title,
  confirmNavigation,
  onSearch,
  disabled = false,
}: {
  title: string;
  confirmNavigation?: () => boolean;
  onSearch?: () => void;
  disabled?: boolean;
}) {
  return (
    <header className="organizer-topbar flex min-h-16 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 text-neutral-900 sm:flex-nowrap sm:px-6">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
      <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto">
        <OrganizerEventSearch confirmSearch={confirmNavigation} onSearch={onSearch} disabled={disabled} />
        <OrganizerNotificationsLink confirmNavigation={confirmNavigation} disabled={disabled} />
      </div>
    </header>
  );
}
