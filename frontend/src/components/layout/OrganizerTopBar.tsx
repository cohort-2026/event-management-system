import OrganizerEventSearch from '@/components/layout/OrganizerEventSearch';
import OrganizerNotificationsLink from '@/components/layout/OrganizerNotificationsLink';

export default function OrganizerTopBar({
  title,
  subtitle,
  confirmNavigation,
  onSearch,
  disabled = false,
  showTitle = true,
  heading,
  headingEyebrow,
  headingDetail,
  compactHeading = false,
}: {
  title: string;
  subtitle?: string;
  confirmNavigation?: () => boolean;
  onSearch?: () => void;
  disabled?: boolean;
  showTitle?: boolean;
  heading?: string;
  headingEyebrow?: string;
  headingDetail?: string;
  compactHeading?: boolean;
}) {
  return (
    <header className="organizer-topbar flex min-h-16 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 text-neutral-900 sm:flex-nowrap sm:px-6">
      {showTitle && (
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-neutral-600">Organizer</span>
          <span className={`block truncate ${subtitle ? 'mt-1 text-4xl font-bold' : 'mt-1 text-sm font-semibold'}`}>{title}</span>
          {subtitle && <span className="mt-1 block text-sm text-neutral-500">{subtitle}</span>}
        </div>
      )}
      {heading && (
        <div className="min-w-0 flex-1">
          {headingEyebrow && <span className="block text-sm font-bold sm:text-base">{headingEyebrow}</span>}
          <span className={`block whitespace-pre-line font-bold ${compactHeading ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>{heading}</span>
          {headingDetail && <span className="block text-sm font-bold">{headingDetail}</span>}
        </div>
      )}
      <div className="ml-auto flex min-w-0 w-full items-center justify-end gap-3 sm:w-auto">
        <OrganizerEventSearch confirmSearch={confirmNavigation} onSearch={onSearch} disabled={disabled} />
        <OrganizerNotificationsLink confirmNavigation={confirmNavigation} disabled={disabled} />
      </div>
    </header>
  );
}
