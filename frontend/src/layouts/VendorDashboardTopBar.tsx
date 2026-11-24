import DashboardTopBar from '@/layouts/DashboardTopBar';
import VendorSearchField from '@/layouts/VendorSearchField';
import NotificationBell from '@/layouts/NotificationBell';

export default function VendorDashboardTopBar({ title, subtitle, searchValue, onSearchChange }: {
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  return <DashboardTopBar title={title} subtitle={subtitle} showMenu actions={<>
    <VendorSearchField {...(searchValue !== undefined ? { value: searchValue, onChange: onSearchChange } : {})} />
    <NotificationBell appearance="header" />
  </>} />;
}
