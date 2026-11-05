# Frontend Routes

All routes are defined in `frontend/src/App.tsx` using React Router v7 (`react-router-dom`).

Protected routes use `ProtectedRoute` (`components/layout/ProtectedRoute.tsx`), which redirects unauthenticated users to `/login` and users without the required role to `/events`.

---

## Public Routes

| Path | Page file | Notes |
|---|---|---|
| `/` | `pages/LandingPage.tsx` | Landing page |
| `/login` | `pages/auth/Login.tsx` | |
| `/register` | `pages/auth/Register.tsx` | |
| `/forgot-password` | `pages/auth/ForgotPassword.tsx` | |
| `/events` | `pages/events/EventList.tsx` | Browse & search published events |
| `/events/:id` | `pages/events/EventDetail.tsx` | View event details; book from here |

---

## Organizer Routes

Required role: `ORGANIZER`

| Path | Page file | Notes |
|---|---|---|
| `/organizer` | `pages/organizer/OrganizerDashboard.tsx` | Overview of own events |
| `/organizer/events/new` | `pages/organizer/CreateEvent.tsx` | Create event details and ticket tiers; save a draft or submit for approval |
| `/organizer/events/:id/edit` | `pages/organizer/EditEvent.tsx` | Correct a draft or rejected event and resubmit it |
| `/organizer/events/:id/registrations` | `pages/organizer/EventRegistrations.tsx` | View attendee registrations |
| `/organizer/events/:id/vendors` | `pages/organizer/VendorApplications.tsx` | Review stand requests, assign stands, and approve/reject with feedback |
| `/organizer/events/:id/check-in` | `pages/organizer/CheckIn.tsx` | Check attendees/vendor staff in on event day |

Organizer event creation uses `POST /api/events` and requires title,
description, category, event format, start/end date and time, capacity, venue
or meeting information, and ticket types whose quantities sum to the event
capacity. An optional HTTPS/HTTP banner image URL is supported. Drafts are
editable, and organizers can also edit pending events. Admin rejection returns
the event to `DRAFT`, records required feedback, and emails that feedback to the
organizer; the organizer can correct the draft and resubmit it through
`PATCH /api/events/:id/submit`. `PUBLISHED` is the project status for an
approved event; only `PUBLISHED` events are returned by public event routes.
Minor edits to published events take effect immediately, while changes to the
date, time, venue, capacity, or ticket prices return the event to
`PENDING_APPROVAL`. Published-event changes notify registered attendees and
approved vendors. Organizers can cancel their own published events through
`PATCH /api/events/:id/cancel`, which also notifies registered attendees and
approved vendors. Admins review events through
`GET /api/events/admin/approval-queue`, then use the approve/reject endpoints.
Approval and rejection decisions trigger organizer email notifications.

---

## Vendor Routes

Required role: `VENDOR`

| Path | Page file | Notes |
|---|---|---|
| `/vendor` | `pages/vendor/VendorDashboard.tsx` | Overview of own applications and stands |
| `/vendor/events/:id/apply` | `pages/vendor/ApplyForStand.tsx` | Submit or revise a stand request for an event |
| `/vendor/applications` | `pages/vendor/MyApplications.tsx` | View requests, decisions, assigned stands, and rejection feedback |
| `/vendor/applications/:id/staff` | `pages/vendor/StaffManagement.tsx` | Add/manage staff members for an approved stand |

Stand requests are submitted through `POST /api/vendors/apply` with the requested
stand type, size, setup details, and optional supporting information. Organizers
with an approved profile can review requests for their own events through
`GET /api/events/:id/vendors`, then use `PATCH /api/vendors/:id/approve` with an
assigned stand identifier or `PATCH /api/vendors/:id/reject` with a required
reason. Approved stand identifiers are unique per event; decisions and vendor
notifications are recorded together. Rejected requests can be corrected and
resubmitted from the vendor's applications list.

---

## Admin Routes

Required role: `ADMIN`

| Path | Page file | Notes |
|---|---|---|
| `/admin` | `pages/admin/AdminDashboard.tsx` | Overview of pending events and system activity |
| `/admin/approvals` | `pages/admin/ApprovalQueue.tsx` | Review and approve/reject `PENDING_APPROVAL` events |
| `/admin/users` | `pages/admin/UserManagement.tsx` | Create and list organizer accounts |

---

## Platform Admin Routes

Required role: `PLATFORM_ADMIN`

| Path | Page file | Notes |
|---|---|---|
| `/platform-admin/settings` | `pages/platform-admin/PlatformSettings.tsx` | Platform-level configuration |
| `/platform-admin/account-recovery` | `pages/platform-admin/AccountRecovery.tsx` | Reset locked-out accounts |

---

## Management Routes

Required role: `MANAGEMENT`

| Path | Page file | Notes |
|---|---|---|
| `/management/reports` | `pages/management/ReportsDashboard.tsx` | Aggregate view across all events |
| `/management/reports/:id` | `pages/management/EventReport.tsx` | Per-event registrations, check-in rate, vendor fill-rate |

---

## Catch-all

| Path | Page file |
|---|---|
| `*` | `pages/NotFound.tsx` |

---

## Route Guard

`ProtectedRoute` (`components/layout/ProtectedRoute.tsx`) wraps role-restricted route groups.

- No token → redirect to `/login`
- Wrong role → redirect to `/` landing page

It reads the authenticated user from `AuthContext` and accepts an optional `roles` array.
