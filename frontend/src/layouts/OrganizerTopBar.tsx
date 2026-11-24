import OrganizerEventSearch from '@/layouts/OrganizerEventSearch';
import OrganizerNotificationsLink from '@/layouts/OrganizerNotificationsLink';
import DashboardTopBar from '@/layouts/DashboardTopBar';

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
  const topTitle = showTitle ? title : heading;
  const topSubtitle = showTitle ? subtitle : [headingEyebrow, headingDetail].filter(Boolean).join(' · ') || undefined;
  return <DashboardTopBar title={topTitle} subtitle={topSubtitle} compactTitle={compactHeading} className="organizer-topbar sm:flex-nowrap" actions={<>
        <OrganizerEventSearch confirmSearch={confirmNavigation} onSearch={onSearch} disabled={disabled} />
        <OrganizerNotificationsLink confirmNavigation={confirmNavigation} disabled={disabled} />
      </>} />;
}
