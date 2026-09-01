# Event Management System — Planning Documentation (Revised)

**Team:** Event Management
**Revision note:** This version addresses the mentor feedback dated 25 August 2026. Changes are concentrated in Sections 3–8; Section 1 (Problem Understanding) is carried over largely unchanged, as it was reviewed favourably.

---

## 1. Problem Understanding

### The Problem

The client regularly organizes different types of events, including workshops, training sessions, networking events, and company activities. Currently, information about these events and the people attending them is managed using different, disconnected methods.

As the number of events increases, this becomes difficult to manage: event information and attendee information are spread across separate processes or tools, making it harder for organizers to maintain accurate event details, manage registrations consistently, and quickly determine who is attending a particular event. This also creates duplicated information, missing or outdated records, difficulty tracking registrations, and limited visibility of attendee numbers.

The client requires a centralized, digital way of managing event information, registrations, and — as identified in this revision — the external vendors who pay to have a presence at these events.

### People Affected

| Who | How they are affected |
|---|---|
| **Event Organizers** | Must manually combine information from different sources to know who is attending, and have no consistent way to manage vendor participation |
| **Attendees** | Have no centralized way to view events, register, or track their registration status |
| **Vendors** | Currently have no formal channel to apply for a stand, provide business information, or receive confirmation — this is presently handled informally, if at all |
| **The Organization / Client** | Loses visibility as events scale, cannot easily see event and vendor revenue in one place, and cannot maintain consistent records |

### Proposed Solution

We propose a centralized, web-based Event Management System (a single Next.js application) that gives the client one platform for managing events, attendee registrations, and vendor participation. Authorized event organizers will create and manage events; attendees will browse and register; vendors will apply for and manage a stand or space at an event; and administrators will approve events and oversee the system. We are building this so that Phase 1 supports the full data model (accounts, events, bookings, vendors) even though not every feature is active from day one — see Section 2.

### Success Criteria

The project will be considered successful if the system enables the client to:
- Manage event information from a centralized platform.
- Create, update, and manage events more efficiently, including an approval step before events go live.
- Provide attendees with a clear way to view and register for available events.
- Give vendors a formal way to apply for, pay for, and manage a stand at an event.
- View the people and vendors registered for each event, and the number of registrations/stands filled.
- Reduce the need to manually combine event, attendee, and vendor information from different tools.
- Maintain consistent, centralized, and auditable records as event volume grows.

---

## 2. What We Are Building, and When

We are **not** removing payments, check-in, notifications, calendar sync, or analytics from the plan — every feature the client will eventually need is documented below. What changes across phases is *when* it is built, not *whether* it exists in the plan.

| Phase | What is in it |
|---|---|
| **Phase 1 — build first** | Accounts (attendee, organizer, administrator, vendor); create/edit/submit/approve/publish events; browse and search events; book a place at a free event; cancel a booking; view who booked; count bookings; vendor application (submission only, no payment yet) |
| **Phase 2 — build next** | Ticket types (including vendor stand "tickets"); vendor application approval and invoicing; online payments for both attendee tickets and vendor stands; check-in (manual/search-based); confirmation and reminder notifications |
| **Phase 3 — later version** | QR-code scanning for check-in; calendar sync; refunds; waiting lists; detailed analytics/reports; possible AI recommendations |

**Design principle:** Phase 1 will be built so that Phase 2 and 3 can be added without reworking the data model. Concretely:
- Every booking has a **ticket type** from day one, even while all tickets are functionally identical in Phase 1. Adding a distinct "vendor stand" type later is then a small change, not a redesign.
- Every booking has a **payment status** field (`NOT_REQUIRED`, `PENDING`, `PAID`) from day one, even while every event is free in Phase 1. Turning on real payments in Phase 2 becomes a matter of wiring up a gateway, not restructuring bookings.
- Vendors and their **business information** (company name, registration number, description of goods/services) are captured as a distinct record type from Phase 1, even before payment/invoicing exists, so their application and approval workflow doesn't need to be retrofitted later.

---

## 3. Stakeholders and Users

| User / Stakeholder | Role | Goal | Main Actions |
|---|---|---|---|
| **Attendee** | Person who wants to attend an event | Find and register for events easily, and keep track of what they've booked | Create account; log in; browse/search events; view event details; book a place; pay if required; cancel own booking; view own registrations/tickets |
| **Vendor** | A business that wants a stand or space at an event to sell products, offer services, or promote itself | Secure a space at an event and get their team members access on the day | Apply for a stand at an event; submit business details (company name, registration number, what they are selling); await approval; pay the invoice for the stand; add staff members to receive entry passes; view their stand's status and details |
| **Event Organizer** | An employee responsible for organizing workshops, training sessions, networking events, or company activities | Manage events, attendees, and vendors efficiently, with minimal manual admin | Create an event (draft); submit event for approval; edit event details; view registrations; view/approve/reject vendor applications for their event; check attendees in at the venue; close registration; view post-event numbers |
| **Administrator** (client-side) | An employee of the client who oversees the system on the client's behalf | Ensure only verified events go live, and that organizer accounts are managed correctly | Review and approve/reject submitted events; manage organizer accounts and roles; oversee registrations and vendor activity across events; view system-level information relevant to running the client's events |
| **Platform Admin** (us — the team building and operating the system) | Operates the underlying platform, not the client's day-to-day data | Keep the platform running and accessible without touching the client's business data | Create the client's very first Administrator account; manage platform-level settings; assist with locked-out accounts; **cannot** view attendee lists, vendor business details, or event content — see Section 6 |
| **Management** | Managers/decision-makers within the client organization | Understand event activity and participation to make decisions about future events | View event information; view registration and vendor statistics; view participation/revenue reports (read-only — no editing) |

**Note on data sharing:** if a vendor requests the attendee list for an event, this is other people's personal information. Attendees must have given consent (e.g., at registration) before any attendee data is shared with a vendor.

---

## 4. System Requirements

### A. Functional Requirements

**1. Account Management** (all roles)
- The system shall allow a user to create an account, log in, log out, and reset their password.
- The system shall allow a user to manage their own profile information.

**2. Event Management**
- The system shall allow an organizer to create an event with a title, description, venue, date/time, capacity, and ticket type(s).
- The system shall save a newly created event with status `DRAFT` until the organizer submits it.
- The system shall allow an organizer to submit a draft event for approval, changing its status to `PENDING_APPROVAL`.
- The system shall allow an authorized Administrator to approve a `PENDING_APPROVAL` event (status becomes `PUBLISHED` and visible to attendees) or reject it (status returns to `DRAFT` with a reason recorded).
- The system shall require an event to return to `PENDING_APPROVAL` if the organizer edits a key field (date, time, venue, capacity, or price) after it has been published. Minor edits (e.g., description wording) do not require re-approval.
- The system shall allow an organizer to unpublish or cancel their own published event, and shall notify all registered attendees and approved vendors when this happens.
- The system shall prevent an organizer from editing, submitting, or cancelling an event they do not own.

**3. Event Browsing**
- The system shall allow any user to view, search, and filter published events by category, date, or location.
- The system shall display detailed information for a selected event, including whether it is free or paid, and whether vendor stands are available.

**4. Attendee Registration & Booking**
- The system shall allow a logged-in attendee to book a place at an event with available capacity.
- The system shall prevent booking once an event's capacity has been reached.
- For a free event, the system shall confirm the booking immediately and generate a ticket with payment status `NOT_REQUIRED`.
- For a paid event, the system shall place a temporary hold on the seat once checkout begins, set payment status to `PENDING`, and release the hold automatically if payment is not completed within a defined window (e.g., 10 minutes).
- The system shall prevent a user from booking the same event twice; if they try, it shall display their existing registration status instead.
- The system shall allow an attendee to cancel their own booking where the organizer's policy permits it, and shall release the seat back to capacity.

**5. Vendor Management**
- The system shall allow a vendor to apply for a stand at a published event, submitting company name, registration number, and a description of what they intend to sell or promote.
- The system shall record a vendor application with status `PENDING_REVIEW`.
- The system shall allow the organizer of that event to approve or reject a vendor application.
- Upon approval, the system shall generate an invoice (not a receipt) for the vendor's stand, including their business details.
- The system shall allow an approved vendor to add multiple staff members to their stand, each receiving their own entry pass.
- The system shall prevent a vendor from viewing another vendor's business details or invoice.

**6. Ticketing**
- The system shall generate a unique ticket with a reference number upon successful booking or vendor approval.
- The system shall record a ticket type on every booking (even where only one type exists), to support multiple ticket types (e.g., standard, VIP, vendor stand) without a redesign.
- The system shall allow a user to view their own ticket(s) at any time.

**7. Payment Management** (Phase 2)
- Where an event or vendor stand requires payment, the system shall display the price, process payment through an integrated payment gateway, and record the result as `PAID` or `FAILED`.
- The system shall not confirm a booking or vendor stand as secured until payment status is `PAID`.
- The system shall provide a receipt to attendees and an invoice (with business details) to vendors.

**8. Attendee & Vendor Oversight** (Organizer)
- The system shall allow an organizer to view, search, and (where applicable) update registered attendees and approved vendors for their own event.
- The system shall allow an organizer to view the current count of registrations and vendor stands filled versus capacity.

**9. Notifications** (Phase 2)
- The system shall send notifications for: registration/vendor-approval confirmation, payment confirmation, event reminders, event changes, and event cancellations.

**10. Check-In**
- The system shall allow an organizer/staff member to check in an attendee or vendor staff member by searching their name/reference (Phase 2) or scanning a QR code (Phase 3).
- The system shall mark a ticket as `USED` upon check-in and shall reject a second check-in attempt on the same ticket, displaying a warning rather than allowing re-entry.
- The system shall display the current number of checked-in attendees for an event.

**11. Reports** (Phase 3, with basic counts available from Phase 1)
- The system shall allow an Administrator or Management user to view: registrations per event, check-ins per event, vendor stands filled, and (once payments exist) revenue.

**12. Administrator & Platform Admin Functions**
- The system shall allow an Administrator to manage organizer accounts and roles within the client's organization.
- The system shall allow a Platform Admin to create the client's first Administrator account, and to manage platform-level settings (see Section 6 for the boundary between these two roles).

### B. Non-Functional Requirements

- **Security:** Users shall only access information they are authorized to view; passwords must be securely stored; payment information must be handled via a secure, PCI-compliant payment provider rather than stored directly.
- **Performance:** The system should respond quickly during event search, booking, and payment.
- **Availability:** The system should remain available during periods of high registration traffic (e.g., a popular event opening for booking).
- **Usability:** The interface should be simple, mobile-friendly, and provide clear navigation for all roles (Attendee, Vendor, Organizer, Administrator, Management).
- **Reliability:** Bookings, payments, tickets, vendor applications, and attendance records must be recorded accurately and atomically (a payment should never succeed without a corresponding ticket, or vice versa).
- **Scalability:** The system should support a growing number of users, events, registrations, and vendor applications without redesign.
- **Maintainability:** The system should be structured so developers can fix bugs, add features, and modify event/vendor functionality without major rework — supported by the Phase 1 data model described in Section 2.

### C. Assumptions

- Users have internet access and either hold or can create a valid account before booking, applying as a vendor, or managing events.
- Event organizers provide accurate event information; the system does not independently verify event legitimacy beyond the Administrator's approval step.
- Events may be free or paid, and this can vary per event or even per ticket type within an event.
- A vendor stand is treated internally as a special category of "booking" against a limited quantity (stands), distinct from attendee seats, but sharing the same underlying approval/payment/ticket infrastructure.
- The Administrator role belongs to the client's organization; the Platform Admin role belongs to our team as system operators (see Section 6) — these are assumed to be different people in practice.
- The system will use a relational database, secure authentication, and a secure third-party payment provider once Phase 2 payments are introduced.

---

## 5. "Who Can Do What" — Role Permission Matrix

| Action | Attendee | Vendor | Organizer | Administrator | Platform Admin | Management |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Create own account | Yes | Yes | Yes | Yes | — | Yes |
| Browse/search published events | Yes | Yes | Yes | Yes | No | Yes |
| Book a place at an event | Yes | No | No | No | No | No |
| Cancel own booking | Yes (own) | — | — | — | No | No |
| Apply for a vendor stand | No | Yes | No | No | No | No |
| View own vendor application/invoice status | No | Yes (own) | No | No | No | No |
| Create/edit a draft event | No | No | Yes (own) | No | No | No |
| Submit event for approval | No | No | Yes (own) | No | No | No |
| Approve/reject an event | No | No | No | Yes | No | No |
| Approve/reject a vendor application | No | No | Yes (own event) | No | No | No |
| Publish/unpublish own event | No | No | Yes (own, post-approval) | No | No | No |
| View attendee list for an event | No | No | Yes (own event) | Yes | No | No |
| View vendor business details for an event | No | No | Yes (own event) | Yes | No | No |
| Check attendees/vendors in | No | No | Yes (own event) | Yes | No | No |
| Manage organizer accounts/roles | No | No | No | Yes | No | No |
| Create the first Administrator account | No | No | No | No | Yes | No |
| Manage platform-level settings | No | No | No | No | Yes | No |
| Reset a locked-out account (credentials only) | No | No | No | No | Yes | No |
| View reports/analytics (aggregate) | No | No | Yes (own events) | Yes | No | Yes |
| View audit logs of Platform Admin actions | No | No | No | Yes | — | No |

*"Own" means scoped to records the user created or was assigned to — never another user's data.*

---

## 6. Administrator vs. Platform Admin — Why the Split Matters

Our original plan had a single "Administrator" responsible for approving events, managing users, managing events, managing registrations, and assigning roles. That conflates two different jobs:

| | Who they work for | What they manage |
|---|---|---|
| **Administrator** | The client | Approving events, overseeing registrations and vendor activity, managing organizer accounts and roles |
| **Platform Admin** | Us (the team that builds and runs the system) | Creating the client's first Administrator account, platform settings, fixing access problems |

The client manages their own users day-to-day. The only account we ever create directly is the client's **first** Administrator account — this solves the "who creates the first account?" bootstrapping problem that every system needs to answer.

**Governing rule:** the Platform Admin manages the *system*, not the *data*. They can reset a locked-out organizer's password, but they cannot open an attendee list or read a vendor's business details. Every Platform Admin action is logged for accountability.

---

## 7. User Stories and Acceptance Criteria

*(Rewritten in event-management language, and expanded to cover the main action of every role, including vendors and edge cases.)*

**Story 1 — Create an Account**
As a new user, we want to create an account, so that we can log in and use the system as an attendee, vendor, or organizer.
- Given a user provides a valid email and password, when they submit the sign-up form, then an account is created and they are logged in.
- Given a user provides an email already in use, when they submit, then the system displays an error and does not create a duplicate account.

**Story 2 — Search and Filter Events**
As an attendee, we want to search and filter available events, so that we can find one that suits us.
- Given an attendee is browsing events, when they filter by date, category, or location, then only matching published events with available capacity are shown.

**Story 3 — Book a Place at a Free Event**
As an attendee, we want to book a place at a free event, so that my attendance is confirmed.
- Given an attendee is viewing a published free event with available capacity, when they complete the booking, then a ticket is generated with payment status `NOT_REQUIRED` and the event's available capacity decreases by one.
- Given an attendee has already booked that event, when they try to book again, then the system shows their existing registration status instead of creating a duplicate.
- Given the event has reached capacity, when an attendee tries to book, then the system prevents the booking and displays that the event is full.

**Story 4 — Book and Pay for a Paid Event**
As an attendee, we want to book and pay for a paid event, so that my seat is secured.
- Given an attendee selects a paid event with available capacity, when they begin checkout, then the seat is held temporarily and payment status is set to `PENDING`.
- Given payment completes successfully within the hold window, when the system confirms it, then the ticket status becomes `PAID` and a QR-ticket is generated.
- Given payment fails or the hold window expires, when this happens, then the seat is released back to available capacity and the attendee is notified.

**Story 5 — Cancel a Booking**
As an attendee, we want to cancel my own booking, so that I free up the seat if I can no longer attend.
- Given an attendee has a confirmed booking and the organizer's policy allows cancellation, when they cancel, then the booking status changes to `CANCELLED` and the seat becomes available again.

**Story 6 — Create an Event (Organizer)**
As an organizer, we want to create a new event with title, venue, date, and capacity, so that it can be reviewed and made available to attendees.
- Given an organizer submits valid event details, when they save it, then the event is created with status `DRAFT`.
- Given an organizer submits the event for approval, when they do so, then its status changes to `PENDING_APPROVAL` and it is sent to an Administrator.

**Story 7 — Approve or Reject an Event (Administrator)**
As an Administrator, we want to approve or reject submitted events, so that only verified events go live.
- Given an event is `PENDING_APPROVAL`, when the Administrator approves it, then its status becomes `PUBLISHED` and it becomes visible to attendees.
- Given an event is `PENDING_APPROVAL`, when the Administrator rejects it with a reason, then its status returns to `DRAFT` and the organizer is notified with that reason.

**Story 8 — Edit a Published Event**
As an organizer, we want to edit event details after publishing, so that I can correct or update information.
- Given an organizer edits a non-critical field (e.g., description), when they save it, then the change applies immediately without re-approval.
- Given an organizer edits a critical field (date, time, venue, capacity, or price), when they save it, then the event returns to `PENDING_APPROVAL` before the change goes live.

**Story 9 — Apply for a Vendor Stand**
As a vendor, we want to apply for a stand at an event, so that we can sell or promote our business there.
- Given a vendor submits company name, registration number, and a description of what they sell, when they apply to a published event with stands available, then the application is recorded with status `PENDING_REVIEW`.

**Story 10 — Approve or Reject a Vendor Application**
As an organizer, we want to approve or reject a vendor's application for my event, so that only suitable vendors get a stand.
- Given a vendor application is `PENDING_REVIEW`, when the organizer approves it, then an invoice is generated for the vendor and the application status becomes `APPROVED`.
- Given the organizer rejects the application, when they do so, then the vendor is notified and the stand remains available to other applicants.

**Story 11 — Pay Vendor Invoice and Add Staff**
As an approved vendor, we want to pay our invoice and add my staff, so that my team can access the event.
- Given a vendor's invoice is unpaid, when they complete payment, then the invoice status becomes `PAID` and they can add staff members.
- Given a vendor adds a staff member, when they submit the staff member's details, then that staff member receives their own entry pass linked to the vendor's stand.

**Story 12 — View Registrations and Vendors for My Event**
As an organizer, we want to view everyone registered or approved for my event, so that I know who to expect.
- Given an organizer opens their event's registration view, when registrations exist, then attendees and approved vendors are listed; when none exist yet, a "no registrations yet" message is shown instead.

**Story 13 — Check In at the Venue**
As an organizer/staff member, we want to check in attendees and vendor staff at the venue, so that entry is verified and accurate.
- Given a valid, unused ticket or pass, when it is checked in (by scan or manual search), then it is marked `USED` and entry is allowed.
- Given a ticket or pass has already been used, when a second check-in is attempted, then the system displays a warning and does not allow duplicate entry.

**Story 14 — Manage Organizer Accounts**
As an Administrator, we want to manage organizer accounts and roles, so that only appropriate staff can create and manage events.
- Given an Administrator selects a user, when they change that user's role, then the change is validated and saved, and confirmation is displayed.

**Story 15 — View Reports**
As Management, we want to view registration, attendance, and vendor participation figures, so that we can make informed decisions about future events.
- Given Management opens the reports view for a completed event, when the data is available, then attendance rate, registrations, and vendor stand fill-rate are displayed.

---

## 8. User Flows

Six separate flows, one per role/scenario, each showing the normal path and what happens when something goes wrong. ("Register" is used only to mean creating an account; booking a place is always called "Book".)

### Flow 1 — Attendee: Free Event
```
Attendee visits system
   |
Browse / search events
   |
Select event -> View details
   |
Event published and has available capacity?
   No (closed/unpublished) -> Display "registration closed" -> End
   No (full)               -> Display "event full" -> End
   Yes
   |
Logged in?
   No  -> Create account / Log in -> Return to event
   Yes
   |
Already booked this event?
   Yes -> Display existing registration status -> End
   No
   |
Confirm booking
   |
Booking saved, ticket generated (NOT_REQUIRED payment status)
   |
Confirmation displayed / sent
```

### Flow 2 — Attendee: Paid Event
```
Attendee visits system
   |
Browse / search events -> Select event -> View details
   |
Event published, paid, and has available capacity?
   No (full/closed) -> Display appropriate message -> End
   Yes
   |
Logged in?
   No  -> Create account / Log in -> Return to event
   Yes
   |
Already booked?
   Yes -> Display existing registration status -> End
   No
   |
Begin checkout -> Seat placed on temporary hold (status: PENDING)
   |
Complete payment within hold window?
   No (fails or times out) -> Release seat -> Notify attendee -> End
   Yes
   |
Payment status set to PAID
   |
Ticket generated and confirmation sent
```

### Flow 3 — Vendor
```
Vendor visits system -> Logs in / creates account
   |
Selects a published event with stands available
   |
Submits application (company name, registration number, description)
   |
Application status: PENDING_REVIEW
   |
Organizer approves?
   No -> Vendor notified of rejection -> End
   Yes
   |
Invoice generated for stand
   |
Vendor pays invoice
   |
Payment successful?
   No  -> Invoice remains unpaid -> Reminder sent -> If unpaid past deadline, stand released to other applicants -> End
   Yes
   |
Vendor adds staff members -> Each receives an entry pass
   |
Vendor can view/manage stand details until event day
```

### Flow 4 — Organizer
```
Organizer logs in
   |
Authentication successful?
   No  -> Display login error -> End
   Yes
   |
Create new event (title, date, venue, capacity, ticket types)
   |
All required fields valid?
   No  -> Display validation errors -> Organizer corrects
   Yes
   |
Event saved as DRAFT
   |
Organizer submits for approval -> Status: PENDING_APPROVAL
   |
   (while pending, organizer can still edit the draft)
   |
Administrator approves?
   No  -> Event returns to DRAFT with rejection reason -> Organizer edits and resubmits
   Yes
   |
Event PUBLISHED
   |
Organizer manages registrations & vendor applications as they arrive
   |
On event day: organizer checks attendees/vendor staff in
   |
After event: organizer views attendance & registration summary
```

### Flow 5 — Administrator
```
Administrator logs in
   |
Authentication successful?
   No  -> Display login error -> End
   Yes
   |
Opens queue of PENDING_APPROVAL events
   |
Selects an event -> Reviews details
   |
Approve or reject?
   Reject  -> Enter reason -> Organizer notified -> Event returns to DRAFT
   Approve -> Event status becomes PUBLISHED -> Organizer notified
   |
(Separately) Administrator can:
   - Open user management -> select organizer account -> change role / activate / deactivate -> confirmation displayed
   - View registration and vendor overview across all events
```

### Flow 6 — Management
```
Management user logs in
   |
Authentication successful?
   No  -> Display login error -> End
   Yes
   |
Opens reports dashboard
   |
Selects an event or an aggregate view (all events)
   |
Data available for this event/period?
   No  -> Display "no data yet" (e.g., event hasn't happened) -> End
   Yes
   |
View registrations, check-in rate, vendor stand fill-rate, and (once Phase 2 is live) revenue
   |
(Phase 3) Export report
```

*Note: Platform Admin actions (creating the first Administrator account, resetting a locked account, platform settings) are rare, low-frequency actions rather than a recurring user journey, so we have not drawn a full flow for this role — but every such action is logged, per Section 6.*

---

## 9. Technology Stack

| Layer | Choice | Reasoning |
|---|---|---|
| **Application framework** | Next.js (React) with TypeScript, as a single application | One codebase for frontend and backend (API routes / server actions) — matches the programme standard and avoids the frontend/backend split inconsistency in our earlier draft |
| **Database** | PostgreSQL | Relational integrity is important for our data (events, bookings, vendors, payments all reference each other with strict rules — e.g., a booking must reference a valid event and cannot exceed capacity) |
| **Authentication** | JWT / session-based authentication (e.g., via NextAuth) | Standard, secure approach compatible with Next.js |
| **API testing** | Postman | Used to test our REST endpoints during development — it is a testing tool, not the API itself |
| **Version control** | Git and GitHub | Standard |
| **Hosting** | Azure, AWS, or Afrihost (to be confirmed) | Cloud hosting options available to the team |

---

## 10. Still Outstanding

- **Wireframes:** low-fidelity sketches of the main screens (event listing, event detail, booking/checkout, vendor application, organizer dashboard, administrator approval queue) are still needed. We recommend a quick paper-and-photo pass per screen before Week 2 — happy to help produce simple digital wireframes as a starting point if that would help the team move faster.
