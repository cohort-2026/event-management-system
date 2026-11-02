# Event Management System — Feature Inventory and Team Issue Backlog

**Snapshot date:** 26 October 2026  
**Purpose:** Summarize the intended product, distinguish working functionality from prototypes, and provide assignable work items.  
**Assignees:** The repository does not identify individual team members, so each issue suggests an owner role. Replace that role with a named teammate when creating or assigning the tracker issue.

## Project at a glance

The system is intended to centralize event publishing, attendee registrations, and vendor participation for workshops, training, networking, and company events. It is a React/TypeScript frontend backed by an Express/TypeScript API and PostgreSQL through Prisma.

The revised plan in [`event-management-planning-v2 (1).md`](./event-management-planning-v2%20%281%29.md) describes a phased rollout. The repository contains a broad UI and data-model prototype, but most product workflows are not yet connected end to end. A page or API client existing in the repository is not, by itself, evidence that the feature works.

## Status key

- **Implemented:** A working end-to-end workflow is present in the code reviewed.
- **Partial / prototype:** Some UI, API shape, data model, or infrastructure exists, but the user workflow is incomplete or uses sample data.
- **Not implemented:** The planned behavior is not yet available.
- **Planned:** Described in project planning documents as a later phase.

## Core feature inventory

| Feature | Intended users | Current status | What is present / remaining |
|---|---|---|---|
| Accounts, authentication, and session | All users | **Implemented, with scope limits** | Registration, email verification/resend, login/logout, session restore, password reset, hashed credentials/OTP, and httpOnly-cookie authentication are wired. Self-registration is limited to attendee/vendor; organizer and administrative account provisioning still needs an agreed flow. |
| Role-based access | All roles | **Partial** | Frontend route guards and backend authentication/role middleware exist. Most protected endpoints are placeholders. Resource-ownership checks are described in authorization docs but are not wired to the route handlers. |
| Browse, search, and view events | Public / attendees | **Partial** | Public listing and detail API endpoints return persisted published events; category/date/location filters are not available. |
| Create, edit, submit, approve, and cancel events | Organizers / admins | **Implemented core lifecycle** | Organizer create/edit/list, draft submission, admin approval/rejection, critical published-event re-approval, cancellation, and audience notifications are wired to the API. Event deletion and organizer registration/vendor-list endpoints remain placeholders; check-in and related vendor workflows are not implemented. |
| Attendee booking and cancellation | Attendees | **Not implemented** | Booking schema and frontend service/types exist, but booking endpoints return `501`; there is no working booking flow, capacity enforcement, or cancellation workflow. |
| Tickets and check-in | Attendees / organizers | **Not implemented** | Ticket data model and API client exist. Ticket endpoints return `501`, and the organizer check-in page is a placeholder. |
| Vendor stand applications | Vendors / organizers | **Partial / prototype** | Schema, API clients, routes, and sample dashboard UI exist. Application endpoints return `501`; application screens and staff management are placeholders. |
| Payments, invoices, and refunds | Attendees / vendors | **Planned** | Data-model fields anticipate payments, but no gateway integration, checkout, invoices, payment reconciliation, or refund workflow is implemented. |
| User administration and account recovery | Admin / platform admin | **Partial / prototype** | User API clients exist, but all user endpoints return `501`. The user-management screen uses sample data; platform account recovery is not connected. |
| Reports and event metrics | Management / admins | **Partial / prototype** | Report routes and API client exist, but endpoints return `501`; the dashboard calculates metrics from hard-coded sample data. |
| Email notifications | All roles | **Partial** | SMTP is used for account verification and password reset, event approval/rejection, and published-event changes/cancellation. Booking, vendor, payment, and reminder notifications are not implemented. |
| Platform administration and audit trail | Platform admin | **Not implemented** | A platform settings route/page exists, but settings, first-admin provisioning, account recovery, and an auditable action history are not implemented. |
| Shared UI and application foundation | All users | **Implemented foundation** | React/TypeScript/Vite, Express, Prisma/PostgreSQL schema and migrations, reusable UI components, routing, API client wrappers, and setup instructions are present. |

## Recommended issue backlog

These are proposed issue records, not issues already opened in GitHub. “Owner” is a suggested discipline, not a named assignee. Acceptance criteria describe the expected outcome so each task can be verified.

### MVP / Phase 1

#### EMS-01 — Implement the public event catalogue API

- **Priority:** P0 — MVP blocker
- **Suggested owner:** Backend developer
- **Dependencies:** None
- **Scope:** Replace `501` handlers for event listing and event details with Prisma-backed reads. Return only published, public events; support the search/filter fields committed to in the team requirements (at minimum category, date, and location); handle unknown event IDs and invalid filter values consistently.
- **Acceptance criteria:**
  - `GET /api/events` returns persisted published events, not drafts or rejected events.
  - Supported search/filter inputs narrow results correctly and are documented.
  - `GET /api/events/:id` returns a published event or a clear not-found response.
  - Integration tests cover visibility, filtering, invalid input, and not-found behavior.

#### EMS-02 — Implement organizer event lifecycle and admin approvals

- **Priority:** P0 — MVP blocker
- **Suggested owner:** Backend developer
- **Dependencies:** None (coordinate the event/API contract with EMS-01)
- **Scope:** Implement draft creation/edit/deletion, submission, approval/rejection, cancellation, and organizer event listings. Enforce ownership and valid state transitions on the server. Record rejection reasons. Confirm the agreed rule for editing published events before implementation.
- **Acceptance criteria:**
  - Organizers can create drafts and manage only events they own.
  - Submitting a draft changes it to `PENDING_APPROVAL`; only an admin can approve or reject it.
  - Rejection stores a reason; approval publishes the event.
  - Invalid state transitions, missing resources, and cross-organizer access are rejected.
  - Tests cover the lifecycle and authorization boundaries.

#### EMS-03 — Connect event browsing, organizer, and approval screens to live APIs

- **Priority:** P0 — MVP blocker
- **Suggested owner:** Frontend developer
- **Dependencies:** EMS-01 and EMS-02
- **Scope:** Replace event sample data and placeholder organizer/admin screens with API-backed listing, detail, create/edit, submissions, and review actions. Keep loading, empty, validation, and server-error states visible.
- **Acceptance criteria:**
  - Event list/detail use API data and the agreed filters.
  - Organizers can create/edit/submit their own event and see its status.
  - Admins see the real pending queue and approval/rejection results.
  - No successful-looking local-only action remains for these workflows.

#### EMS-04 — Implement safe booking, capacity enforcement, and ticket issuance

- **Priority:** P0 — MVP blocker
- **Suggested owner:** Backend developer
- **Dependencies:** Confirm booking/cancellation policies
- **Scope:** Implement attendee booking, own-booking retrieval, and cancellation. Enforce event status, capacity, duplicate booking, and attendee ownership atomically so simultaneous requests cannot overbook. For Phase 1 free events, create a confirmed booking and unique ticket with `NOT_REQUIRED` payment status. Defer paid checkout/holds to the payment issue.
- **Acceptance criteria:**
  - Only an authenticated attendee can book a published event with remaining capacity.
  - Duplicate booking is prevented, including under concurrent requests.
  - A successful free booking updates available capacity and creates one ticket in a transaction.
  - Attendees can list and cancel only their own eligible bookings; cancellation releases capacity once.
  - Tests cover full events, duplicate and concurrent requests, cancellation, and authorization.

#### EMS-05 — Deliver the attendee booking and ticket experience

- **Priority:** P0 — MVP blocker
- **Suggested owner:** Frontend developer
- **Dependencies:** EMS-04
- **Scope:** Connect event detail booking actions and attendee dashboard/bookings/tickets routes to the live API. Remove reliance on sample data and provide confirmation and failure states.
- **Acceptance criteria:**
  - An attendee can book a free event and sees the resulting booking/ticket.
  - Existing bookings, full events, and closed/unpublished events are handled clearly.
  - Attendees can view and cancel eligible bookings.
  - API errors do not show a false success state.

#### EMS-06 — Implement the Phase 1 vendor application submission workflow

- **Priority:** P1 — Phase 1 scope confirmation needed
- **Suggested owner:** Backend developer
- **Dependencies:** None (use the existing event data model)
- **Scope:** Implement vendor application submission for published events and a vendor’s own application list, consistent with the revised plan’s Phase 1 scope. Enforce vendor role, event eligibility, required business fields, and access boundaries. Confirm whether organizer review is Phase 1 or Phase 2 before expanding scope.
- **Acceptance criteria:**
  - Vendors can submit company name, registration number, and business description for an eligible published event.
  - Applications persist with `PENDING_REVIEW`; vendors can view only their own applications.
  - Invalid event state/input and duplicate applications follow documented rules.
  - Tests cover validation and vendor data isolation.

### Follow-on product work

#### EMS-07 — Connect vendor application screens to the application API

- **Priority:** P1
- **Suggested owner:** Frontend developer
- **Dependencies:** EMS-06
- **Scope:** Implement the vendor application form and application list/dashboard using live data. Keep the implementation within the Phase 1 scope agreed for EMS-06.
- **Acceptance criteria:**
  - Vendors can apply from an event and see persisted application status.
  - Their dashboard and application list show live data, loading, empty, and error states.
  - Another vendor’s application/business details are never exposed.

#### EMS-08 — Complete vendor review, invoices, and staff passes

- **Priority:** P2 — Phase 2
- **Suggested owner:** Full-stack developer
- **Dependencies:** EMS-06; payment decision/provider required for invoice payment
- **Scope:** Implement organizer review and vendor status updates, invoice generation/payment state, and staff entry passes. Confirm stand capacity and payment/deadline policies before coding.
- **Acceptance criteria:**
  - Only the organizer for the event can approve or reject an application.
  - Decisions persist and are visible to the owning vendor.
  - Approved vendors can manage authorized staff and each staff member receives a unique pass.
  - Invoice and payment states are traceable; unpaid/expired stand rules release capacity as agreed.

#### EMS-09 — Implement manual ticket check-in

- **Priority:** P1 — Phase 2
- **Suggested owner:** Full-stack developer
- **Dependencies:** EMS-04; EMS-08 for vendor staff passes
- **Scope:** Implement event-scoped manual/search-based check-in for attendee tickets and, when approved by the team, vendor staff passes. Enforce organizer ownership and reject already-used or invalid passes.
- **Acceptance criteria:**
  - Authorized event organizers can find and check in a valid ticket/pass for their event.
  - Successful check-in marks it used exactly once and updates the checked-in count.
  - Invalid, cancelled, wrong-event, already-used, and unauthorized attempts are rejected clearly.
  - Tests cover duplicate check-in and event ownership.

#### EMS-10 — Implement user administration and platform account recovery

- **Priority:** P1
- **Suggested owner:** Backend developer (API) and frontend developer (admin screens)
- **Dependencies:** Agree who provisions the first client administrator
- **Scope:** Replace user endpoint stubs and sample UI. Separate client-admin user/organizer management from platform-admin settings and account recovery. Apply the planning document’s data-access boundary and record privileged platform actions.
- **Acceptance criteria:**
  - Admins can list/manage client accounts and roles according to the agreed permission matrix.
  - Deactivation prevents further authenticated use and can be reversed only by an authorized role.
  - Platform admins can perform only the approved platform/account-recovery actions and cannot read attendee lists or vendor business records.
  - Privileged actions have an actor, action, target, and timestamp in an audit record.

#### EMS-11 — Implement basic live event reports

- **Priority:** P1
- **Suggested owner:** Backend developer (queries) and frontend developer (dashboard)
- **Dependencies:** EMS-04 and EMS-09; EMS-08 for vendor fill-rate
- **Scope:** Replace sample report values with API-backed counts for registrations and check-ins; add vendor fill-rate only when stand capacity exists. Keep revenue analytics for after payments are implemented.
- **Acceptance criteria:**
  - Authorized management/admin users can view aggregate and per-event metrics.
  - Calculations use persisted records and handle zero registrations/capacity without invalid percentages.
  - Unauthorized users and access to non-existent events are rejected.
  - Dashboard loading, empty, and error states are covered.

#### EMS-12 — Add paid attendee checkout and payment reconciliation

- **Priority:** P2 — Phase 2
- **Suggested owner:** Backend developer with payment integration experience
- **Dependencies:** EMS-04; team selects payment provider and hold duration
- **Scope:** Integrate the selected provider using its hosted/secure payment flow, temporary seat holds, verified payment callbacks, and expiration/reconciliation. Do not store card data in this system.
- **Acceptance criteria:**
  - A paid booking holds capacity for the agreed duration and releases it on failure/expiry.
  - Only verified provider outcomes can mark a booking paid and issue/activate its ticket.
  - Duplicate callbacks are idempotent; failed payments cannot leave a confirmed booking or consume capacity.
  - Provider secrets are configuration-only and payment lifecycle tests cover success, failure, expiry, and retries.

#### EMS-13 — Add transactional event and booking notifications

- **Priority:** P2 — Phase 2
- **Suggested owner:** Backend developer
- **Dependencies:** EMS-02, EMS-04, and EMS-08
- **Scope:** Extend the existing mail service with booking/vendor confirmations, event changes/cancellations, and reminders. Define retry/failure behavior so an email problem does not silently corrupt the booking or event transaction.
- **Acceptance criteria:**
  - The agreed notification events send to the correct user with accurate event/status details.
  - Duplicate workflow retries do not send uncontrolled duplicate messages.
  - Delivery failures are logged and observable without undoing a valid booking/payment.
  - Tests cover message selection and failure handling.

#### EMS-14 — Add cross-workflow automated tests and align implementation docs

- **Priority:** P1
- **Suggested owner:** QA/test-focused team member, paired with feature owners
- **Dependencies:** Feature/API contracts for the workflows under test; test setup can begin in parallel.
- **Scope:** Establish repeatable backend integration and frontend workflow coverage for the delivered MVP, and update setup/API/authorization docs to match actual behavior. The repository currently has no discoverable `*.test.*` or `*.spec.*` test files.
- **Acceptance criteria:**
  - Automated tests cover the critical paths: account verification, event approval, free booking/cancellation, vendor application, role/ownership checks, and reports where implemented.
  - Test instructions work from a clean local setup and do not require production credentials.
  - Docs no longer promise endpoints or behavior that still returns `501` or is sample-only.

### Later roadmap candidates

The revised planning document places QR scanning, calendar synchronization, refunds, waitlists, and richer analytics in Phase 3. Create separate issues for these only after the core and Phase 2 flows are stable and the client confirms the details.

## Decisions to confirm before assigning

1. **Scope gate:** The root README says development requires mentor approval, while the repository contains substantial prototype code. Confirm approval status before treating this backlog as authorization to continue implementation.
2. **Event editing after publication:** The revised requirements say critical changes require re-approval; the exact “critical” fields and expected attendee/vendor notification policy need confirmation.
3. **Vendor timing:** The revised plan places vendor application submission in Phase 1 and approval/invoicing in Phase 2, while some existing routes and UI imply review sooner. Confirm the release boundary.
4. **Account provisioning:** Self-registration supports attendee/vendor roles only. Confirm how organizers, client admins, management, and the first client admin are invited or created.
5. **Operational policies:** Confirm booking cancellation rules, paid-seat hold duration, vendor stand capacity/deadlines, payment provider, and notification schedule.

## Repository evidence and supporting documentation

- Overall project brief and current repository status: [`../README.md`](../README.md)
- Revised planning, requirements, role matrix, stories, and flows: [`event-management-planning-v2 (1).md`](./event-management-planning-v2%20%281%29.md)
- Client feedback that informed the revised plan: [`Event-Management-Plan-Feedback.md`](./Event-Management-Plan-Feedback.md)
- Frontend routes: [`routes.md`](./routes.md) and [`../frontend/src/App.tsx`](../frontend/src/App.tsx)
- Backend API route stubs: [`../backend/src/routes/`](../backend/src/routes/)
- Data model: [`../backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- Authentication and authorization: [`auth.md`](./auth.md), [`authorization.md`](./authorization.md), and [`../backend/src/controllers/authController.ts`](../backend/src/controllers/authController.ts)
