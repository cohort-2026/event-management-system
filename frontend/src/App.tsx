import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GuestRoute from '@/components/layout/GuestRoute';
import Spinner from '@/components/ui/Spinner';

// Auth
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import ChangePassword from '@/pages/auth/ChangePassword';
import SetupPassword from '@/pages/auth/SetupPassword';

// Public
import LandingPage from '@/pages/LandingPage';
import EventList from '@/pages/events/EventList';
import EventDetail from '@/pages/events/EventDetail';
import NotFound from '@/pages/NotFound';

// Organizer
import OrganizerDashboard from '@/pages/organizer/OrganizerDashboard';
import CreateEvent from '@/pages/organizer/CreateEvent';
import EditEvent from '@/pages/organizer/EditEvent';
import EventRegistrations from '@/pages/organizer/EventRegistrations';
import VendorApplications from '@/pages/organizer/VendorApplications';
import CheckIn from '@/pages/organizer/CheckIn';

// Attendee
import AttendeeDashboard from '@/pages/attendee/AttendeeDashboard';

// Vendor
import VendorDashboard from '@/pages/vendor/VendorDashboard';
import VendorProfilePage from '@/pages/vendor/VendorProfile';
import ApplyForStand from '@/pages/vendor/ApplyForStand';
import MyApplications from '@/pages/vendor/MyApplications';
import StaffManagement from '@/pages/vendor/StaffManagement';

// Admin
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ApprovalQueue from '@/pages/admin/ApprovalQueue';
import UserManagement from '@/pages/admin/UserManagement';

// Platform Admin
import PlatformSettings from '@/pages/platform-admin/PlatformSettings';
import PlatformAuditHistory from '@/pages/platform-admin/PlatformAuditHistory';
import PlatformAdminLayout from '@/pages/platform-admin/PlatformAdminLayout';
import PlatformOverview from '@/pages/platform-admin/PlatformOverview';
import PlatformAdminManagement from '@/pages/platform-admin/PlatformAdminManagement';
import PlatformReports from '@/pages/platform-admin/PlatformReports';

// Management
import ReportsDashboard from '@/pages/management/ReportsDashboard';
import EventReport from '@/pages/management/EventReport';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Root: landing entry for guests, dashboard for signed-in users ── */}
          <Route path="/" element={<RootRedirect />} />

          {/* ── Guest-only: redirect away if already logged in ── */}
          <Route element={<GuestRoute />}>
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
          </Route>
          <Route path="/setup-password" element={<SetupPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>

          {/* ── Public (accessible to everyone) ── */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/events"     element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />

          {/* ── Attendee ── */}
          <Route element={<ProtectedRoute roles={['ATTENDEE']} />}> 
            <Route path="/attendee" element={<AttendeeDashboard />} />
            <Route path="/attendee/bookings" element={<AttendeeDashboard />} />
            <Route path="/attendee/tickets" element={<AttendeeDashboard />} />
          </Route>

          {/* ── Organizer ── */}
          <Route element={<ProtectedRoute roles={['ORGANIZER']} />}>
            <Route path="/organizer"                              element={<OrganizerDashboard />} />
            <Route path="/organizer/events/new"                   element={<CreateEvent />} />
            <Route path="/organizer/events/:id/edit"              element={<EditEvent />} />
            <Route path="/organizer/events/:id/registrations"     element={<EventRegistrations />} />
            <Route path="/organizer/events/:id/vendors"           element={<VendorApplications />} />
            <Route path="/organizer/events/:id/check-in"          element={<CheckIn />} />
          </Route>

          {/* ── Vendor ── */}
          <Route element={<ProtectedRoute roles={['VENDOR']} />}>
            <Route path="/vendor"                          element={<VendorDashboard />} />
            <Route path="/vendor/profile"                  element={<VendorProfilePage />} />
            <Route path="/vendor/staff"                    element={<StaffManagement />} />
            <Route path="/vendor/events/:id/apply"         element={<ApplyForStand />} />
            <Route path="/vendor/applications"             element={<MyApplications />} />
            <Route path="/vendor/applications/:id/staff"   element={<StaffManagement />} />
          </Route>

          {/* ── Admin ── */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin"            element={<AdminDashboard />} />
            <Route path="/admin/approvals"  element={<ApprovalQueue />} />
            <Route path="/admin/users"      element={<UserManagement />} />
          </Route>

          {/* ── Platform Admin ── */}
          <Route element={<ProtectedRoute roles={['PLATFORM_ADMIN']} />}>
            <Route path="/platform-admin" element={<PlatformAdminLayout />}>
              <Route index element={<PlatformOverview />} />
              <Route path="admins" element={<PlatformAdminManagement />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="audit" element={<PlatformAuditHistory />} />
              <Route path="reports" element={<PlatformReports />} />
            </Route>
          </Route>

          {/* ── Management ── */}
          <Route element={<ProtectedRoute roles={['MANAGEMENT']} />}>
            <Route path="/management/reports"     element={<ReportsDashboard />} />
            <Route path="/management/reports/:id" element={<EventReport />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/* Root route: guests land on public landing page, signed-in users go to their dashboard. */
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;

  if (user) {
    const dashboardPath: Record<string, string> = {
      ORGANIZER: '/organizer',
      VENDOR: '/vendor',
      ADMIN: '/admin',
      PLATFORM_ADMIN: '/platform-admin',
      MANAGEMENT: '/management/reports',
      ATTENDEE: '/attendee',
    };

    return <Navigate to={dashboardPath[user.role] ?? '/events'} replace />;
  }

  return <Navigate to="/landing" replace />;
}
