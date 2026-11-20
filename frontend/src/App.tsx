import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/context/useAuth';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GuestRoute from '@/components/layout/GuestRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import Spinner from '@/components/legacy/Spinner';
import Navbar from '@/components/layout/Navbar';
import { Toaster } from '@/components/ui/sonner';
import type { UserRole } from '@/types/user';

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
import AudiencePage from '@/pages/AudiencePage';
import UpcomingPage from '@/pages/UpcomingPage';
import EventList from '@/pages/events/EventList';
import EventDetail from '@/pages/events/EventDetail';
import NotFound from '@/pages/NotFound';

// Organizer
import OrganizerDashboard from '@/pages/organizer/OrganizerDashboard';
import OrganizerEventHub from '@/pages/organizer/OrganizerEventHub';
import OrganizerProfile from '@/pages/organizer/OrganizerProfile';
import OrganizerReports from '@/pages/organizer/OrganizerReports';
import CreateEvent from '@/pages/organizer/CreateEvent';
import EditEvent from '@/pages/organizer/EditEvent';
import EventRegistrations from '@/pages/organizer/EventRegistrations';
import VendorApplications from '@/pages/organizer/VendorApplications';
import CheckIn from '@/pages/organizer/CheckIn';
import CheckInEvents from '@/pages/organizer/CheckInEvents';

// Attendee
import AttendeeDashboard from '@/pages/attendee/AttendeeDashboard';
import AttendeeBookings from '@/pages/attendee/AttendeeBookings';
import AttendeeTickets from '@/pages/attendee/AttendeeTickets';
import AttendeeTicket from '@/pages/attendee/AttendeeTicket';
import SimulatedPayment from '@/pages/attendee/SimulatedPayment';

// Vendor
import VendorDashboard from '@/pages/vendor/VendorDashboard';
import VendorProfilePage from '@/pages/vendor/VendorProfile';
import ApplyForStand from '@/pages/vendor/ApplyForStand';
import MyApplications from '@/pages/vendor/MyApplications';
import StaffManagement from '@/pages/vendor/StaffManagement';

// Admin
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UserManagement from '@/pages/admin/UserManagement';
import UserAccounts from '@/pages/admin/UserAccounts';
import VendorProfileApprovalQueue from '@/pages/admin/VendorProfileApprovalQueue';
import AdminAuditHistory from '@/pages/admin/AdminAuditHistory';
import AdminReports from '@/pages/admin/AdminReports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavbarVisibility />
        <Toaster />
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
          <Route path="/for/:audience" element={<AudiencePage />} />
          <Route path="/upcoming" element={<UpcomingPage />} />
          <Route path="/events"     element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />

          {/* ── Attendee ── */}
          <Route element={<ProtectedRoute roles={['ATTENDEE']} />}> 
            <Route path="/attendee" element={<AttendeeDashboard />} />
            <Route path="/attendee/bookings" element={<AttendeeBookings />} />
            <Route path="/attendee/tickets" element={<AttendeeTickets />} />
            <Route path="/attendee/tickets/:ticketId" element={<AttendeeTicket />} />
            <Route path="/attendee/payment/simulate" element={<SimulatedPayment />} />
          </Route>

          {/* ── Organizer ── */}
          <Route element={<ProtectedRoute roles={['ORGANIZER']} />}>
            <Route path="/organizer"                              element={<OrganizerDashboard />} />
            <Route path="/organizer/events"                      element={<OrganizerDashboard />} />
            <Route path="/organizer/check-in"                   element={<CheckInEvents />} />
            <Route path="/organizer/vendors"                     element={<VendorApplications />} />
            <Route path="/organizer/reports"                     element={<OrganizerReports />} />
            <Route path="/organizer/notifications"               element={<OrganizerDashboard />} />
            <Route path="/organizer/events/:id"                  element={<OrganizerEventHub />} />
            <Route path="/organizer/profile"                      element={<OrganizerProfile />} />
            <Route path="/organizer/events/new"                   element={<CreateEvent />} />
            <Route path="/organizer/events/:id/edit"              element={<EditEvent />} />
            <Route path="/organizer/events/:id/registrations"     element={<EventRegistrations />} />
            <Route path="/organizer/events/:id/vendors"           element={<VendorApplications />} />
            <Route path="/organizer/events/:id/check-in"          element={<CheckIn />} />
          </Route>

          {/* ── Vendor ── */}
          <Route element={<ProtectedRoute roles={['VENDOR']} />}>
            <Route path="/vendor"                          element={<VendorDashboard />} />
            <Route path="/vendor/events"                   element={<EventList />} />
            <Route path="/vendor/profile"                  element={<VendorProfilePage />} />
            <Route path="/vendor/staff"                    element={<StaffManagement />} />
            <Route path="/vendor/events/:id/apply"         element={<ApplyForStand />} />
            <Route path="/vendor/applications"             element={<MyApplications />} />
            <Route path="/vendor/applications/:id/staff"   element={<StaffManagement />} />
          </Route>

          {/* ── Admin ── */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/vendors" element={<Navigate to="/admin/users/vendors/pending" replace />} />
              <Route path="/admin/users" element={<Navigate to="/admin/users/organizers/pending" replace />} />
              <Route path="/admin/users/organizers" element={<UserManagement key="organizers-approved" profileStatus="APPROVED" />} />
              <Route path="/admin/users/vendors" element={<VendorProfileApprovalQueue status="APPROVED" />} />
              <Route path="/admin/users/organizers/pending" element={<UserManagement key="organizers-pending" profileStatus="PENDING_APPROVAL" />} />
              <Route path="/admin/users/vendors/pending" element={<VendorProfileApprovalQueue status="PENDING_REVIEW" />} />
              <Route path="/admin/user-accounts" element={<UserAccounts />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/audit" element={<AdminAuditHistory />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function NavbarVisibility() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const navbarPages = ['/landing', '/upcoming', '/for/attendees', '/for/organisers', '/for/vendors'];
  const isEventBrowsePage = pathname === '/events' || pathname.startsWith('/events/');
  if (isEventBrowsePage && (loading || user?.role === 'ATTENDEE')) return null;
  if (pathname.startsWith('/events/') && user?.role === 'VENDOR') return null;
  if (!navbarPages.includes(pathname) && !isEventBrowsePage) return null;
  return <Navbar />;
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
    const dashboardPath: Record<UserRole, string> = {
      ORGANIZER: '/organizer',
      VENDOR: user.vendorProfileStatus === 'APPROVED' ? '/vendor' : '/vendor/profile',
      ADMIN: '/admin',
      ATTENDEE: '/attendee',
    };

    return <Navigate to={dashboardPath[user.role]} replace />;
  }

  return <Navigate to="/landing" replace />;
}
