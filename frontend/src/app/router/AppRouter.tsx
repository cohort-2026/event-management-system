import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/context/useAuth';
import ProtectedRoute from '@/layouts/ProtectedRoute';
import GuestRoute from '@/layouts/GuestRoute';
import AdminLayout from '@/layouts/AdminLayout';
import Spinner from '@/components/legacy/Spinner';
import Navbar from '@/layouts/Navbar';
import { Toaster } from '@/components/ui/sonner';
import type { UserRole } from '@/types/user';

// Auth
const Login = lazy(() => import('@/features/auth/pages/Login'));
const Register = lazy(() => import('@/features/auth/pages/Register'));
const VerifyEmail = lazy(() => import('@/features/auth/pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('@/features/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/features/auth/pages/ResetPassword'));
const ChangePassword = lazy(() => import('@/features/auth/pages/ChangePassword'));
const SetupPassword = lazy(() => import('@/features/auth/pages/SetupPassword'));

// Public
const LandingPage = lazy(() => import('@/features/public/pages/LandingPage'));
const AudiencePage = lazy(() => import('@/features/public/pages/AudiencePage'));
const UpcomingPage = lazy(() => import('@/features/public/pages/UpcomingPage'));
const EventList = lazy(() => import('@/features/events/pages/EventList'));
const EventDetail = lazy(() => import('@/features/events/pages/EventDetail'));
const NotFound = lazy(() => import('@/features/public/pages/NotFound'));

// Organizer
const OrganizerDashboard = lazy(() => import('@/features/organizer/pages/OrganizerDashboard'));
const OrganizerEventHub = lazy(() => import('@/features/organizer/pages/OrganizerEventHub'));
const OrganizerProfile = lazy(() => import('@/features/organizer/pages/OrganizerProfile'));
const OrganizerReports = lazy(() => import('@/features/organizer/pages/OrganizerReports'));
const CreateEvent = lazy(() => import('@/features/organizer/pages/CreateEvent'));
const EditEvent = lazy(() => import('@/features/organizer/pages/EditEvent'));
const EventRegistrations = lazy(() => import('@/features/organizer/pages/EventRegistrations'));
const VendorApplications = lazy(() => import('@/features/organizer/pages/VendorApplications'));
const CheckIn = lazy(() => import('@/features/organizer/pages/CheckIn'));
const CheckInEvents = lazy(() => import('@/features/organizer/pages/CheckInEvents'));

// Attendee
const AttendeeDashboard = lazy(() => import('@/features/attendee/pages/AttendeeDashboard'));
const AttendeeBookings = lazy(() => import('@/features/attendee/pages/AttendeeBookings'));
const AttendeeTickets = lazy(() => import('@/features/attendee/pages/AttendeeTickets'));
const AttendeeTicket = lazy(() => import('@/features/attendee/pages/AttendeeTicket'));
const SimulatedPayment = lazy(() => import('@/features/attendee/pages/SimulatedPayment'));

// Vendor
const VendorDashboard = lazy(() => import('@/features/vendor/pages/VendorDashboard'));
const VendorProfilePage = lazy(() => import('@/features/vendor/pages/VendorProfile'));
const ApplyForStand = lazy(() => import('@/features/vendor/pages/ApplyForStand'));
const MyApplications = lazy(() => import('@/features/vendor/pages/MyApplications'));
const StaffManagement = lazy(() => import('@/features/vendor/pages/StaffManagement'));

// Admin
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const UserManagement = lazy(() => import('@/features/admin/pages/UserManagement'));
const UserAccounts = lazy(() => import('@/features/admin/pages/UserAccounts'));
const VendorProfileApprovalQueue = lazy(() => import('@/features/admin/pages/VendorProfileApprovalQueue'));
const AdminAuditHistory = lazy(() => import('@/features/admin/pages/AdminAuditHistory'));
const AdminReports = lazy(() => import('@/features/admin/pages/AdminReports'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavbarVisibility />
        <Toaster />
        <Suspense fallback={<div role="status" className="min-h-dvh flex items-center justify-center bg-neutral-50"><Spinner size="lg" /></div>}>
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
        </Suspense>
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