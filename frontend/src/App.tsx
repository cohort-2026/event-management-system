import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// Auth
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Public events
import EventList from '@/pages/events/EventList';
import EventDetail from '@/pages/events/EventDetail';

// Organizer
import OrganizerDashboard from '@/pages/organizer/OrganizerDashboard';
import CreateEvent from '@/pages/organizer/CreateEvent';
import EditEvent from '@/pages/organizer/EditEvent';
import EventRegistrations from '@/pages/organizer/EventRegistrations';
import VendorApplications from '@/pages/organizer/VendorApplications';
import CheckIn from '@/pages/organizer/CheckIn';

// Vendor
import VendorDashboard from '@/pages/vendor/VendorDashboard';
import ApplyForStand from '@/pages/vendor/ApplyForStand';
import MyApplications from '@/pages/vendor/MyApplications';
import StaffManagement from '@/pages/vendor/StaffManagement';

// Admin
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ApprovalQueue from '@/pages/admin/ApprovalQueue';
import UserManagement from '@/pages/admin/UserManagement';

// Platform Admin
import PlatformSettings from '@/pages/platform-admin/PlatformSettings';
import AccountRecovery from '@/pages/platform-admin/AccountRecovery';

// Management
import ReportsDashboard from '@/pages/management/ReportsDashboard';
import EventReport from '@/pages/management/EventReport';

// Shared
import LandingPage from '@/pages/LandingPage';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />

          {/* Organizer */}
          <Route element={<ProtectedRoute roles={['ORGANIZER']} />}>
            <Route path="/organizer" element={<OrganizerDashboard />} />
            <Route path="/organizer/events/new" element={<CreateEvent />} />
            <Route path="/organizer/events/:id/edit" element={<EditEvent />} />
            <Route path="/organizer/events/:id/registrations" element={<EventRegistrations />} />
            <Route path="/organizer/events/:id/vendors" element={<VendorApplications />} />
            <Route path="/organizer/events/:id/check-in" element={<CheckIn />} />
          </Route>

          {/* Vendor */}
          <Route element={<ProtectedRoute roles={['VENDOR']} />}>
            <Route path="/vendor" element={<VendorDashboard />} />
            <Route path="/vendor/events/:id/apply" element={<ApplyForStand />} />
            <Route path="/vendor/applications" element={<MyApplications />} />
            <Route path="/vendor/applications/:id/staff" element={<StaffManagement />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/approvals" element={<ApprovalQueue />} />
            <Route path="/admin/users" element={<UserManagement />} />
          </Route>

          {/* Platform Admin */}
          <Route element={<ProtectedRoute roles={['PLATFORM_ADMIN']} />}>
            <Route path="/platform-admin/settings" element={<PlatformSettings />} />
            <Route path="/platform-admin/account-recovery" element={<AccountRecovery />} />
          </Route>

          {/* Management */}
          <Route element={<ProtectedRoute roles={['MANAGEMENT']} />}>
            <Route path="/management/reports" element={<ReportsDashboard />} />
            <Route path="/management/reports/:id" element={<EventReport />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
