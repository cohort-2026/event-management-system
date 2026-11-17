import OrganizerEventSearch from '@/components/layout/OrganizerEventSearch';
import OrganizerNotificationsLink from '@/components/layout/OrganizerNotificationsLink';

export default function OrganizerTopBar({
  title,
  subtitle,
  confirmNavigation,
  onSearch,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  confirmNavigation?: () => boolean;
  onSearch?: () => void;
  disabled?: boolean;
}) {
  return (
    <header className="organizer-topbar flex min-h-16 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 text-neutral-900 sm:flex-nowrap sm:px-6">
      <div className="min-w-0 flex-1">
        <span className={`block truncate ${subtitle ? 'text-4xl font-bold' : 'text-sm font-semibold'}`}>{title}</span>
        {subtitle && <span className="mt-1 block text-sm text-neutral-500">{subtitle}</span>}
      </div>
      <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto">
        <OrganizerEventSearch confirmSearch={confirmNavigation} onSearch={onSearch} disabled={disabled} />
        <OrganizerNotificationsLink confirmNavigation={confirmNavigation} disabled={disabled} />
      </div>
    </header>
  );
}
