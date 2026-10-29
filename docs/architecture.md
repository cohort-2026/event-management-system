# Project Architecture

## Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | React 19, TypeScript, Vite              |
| Backend        | Express 5, TypeScript, Node.js          |
| Database       | PostgreSQL (relational)                 |
| Auth           | JWT (Bearer token)                      |
| API testing    | Postman                                 |
| Version control| Git / GitHub                            |

---

## Folder Structure

```
event-management-system/
│
├── backend/
│   └── src/
│       ├── config/               # Env vars and app-wide config
│       ├── controllers/          # Thin handlers — delegate to services
│       │   ├── authController.ts
│       │   ├── eventController.ts
│       │   ├── bookingController.ts
│       │   ├── vendorController.ts
│       │   ├── ticketController.ts
│       │   ├── userController.ts
│       │   └── reportController.ts
│       ├── middleware/
│       │   ├── auth.ts           # authenticate (JWT) + authorize (role guard)
│       │   └── errorHandler.ts   # Global Express error handler
│       ├── models/               # DB schema / ORM model definitions
│       ├── routes/
│       │   ├── index.ts          # Mounts all routers under /api
│       │   ├── authRoutes.ts
│       │   ├── eventRoutes.ts
│       │   ├── bookingRoutes.ts
│       │   ├── vendorRoutes.ts
│       │   ├── ticketRoutes.ts
│       │   ├── userRoutes.ts
│       │   └── reportRoutes.ts
│       ├── services/             # Business logic — one file per domain
│       ├── types/                # TypeScript interfaces and DTOs
│       │   ├── api.ts            # ApiResponse, PaginationQuery, ApiError
│       │   ├── event.ts          # Event, EventStatus, CreateEventDto
│       │   ├── booking.ts        # Booking, BookingStatus, PaymentStatus
│       │   ├── vendor.ts         # VendorApplication, VendorStaffMember
│       │   ├── ticket.ts         # Ticket, TicketStatus
│       │   ├── user.ts           # User, UserRole (all 6 roles)
│       │   └── payment.ts        # Payment, PaymentStatus
│       └── utils/                # Pure helper functions
│
└── frontend/
    └── src/
        ├── assets/               # Images, icons, fonts
        ├── components/
        │   ├── layout/           # Navbar, Sidebar, Footer, PageWrapper
        │   ├── ui/               # Reusable primitives: Button, Modal, Badge
        │   ├── events/           # EventCard, EventList, EventStatusBadge
        │   ├── bookings/         # BookingCard, BookingSummary
        │   ├── vendors/          # VendorApplicationForm, VendorCard
        │   ├── tickets/          # TicketCard, CheckInScanner (Phase 3)
        │   └── reports/          # ReportChart, StatCard
        ├── context/
        │   └── AuthContext.tsx   # Auth state + useAuth hook
        ├── hooks/
        │   ├── useEvents.ts
        │   └── useBookings.ts
        ├── pages/                # One folder per role / feature area
        │   ├── auth/             # Login, Register, ForgotPassword
        │   ├── events/           # EventList, EventDetail (attendee-facing)
        │   ├── organizer/        # Dashboard, CreateEvent, EditEvent,
        │   │                     # EventRegistrations, VendorApplications, CheckIn
        │   ├── vendor/           # VendorDashboard, ApplyForStand,
        │   │                     # MyApplications, StaffManagement
        │   ├── admin/            # AdminDashboard, ApprovalQueue, UserManagement
        │   ├── platform-admin/   # PlatformSettings, AccountRecovery
        │   └── management/       # ReportsDashboard, EventReport
        ├── services/             # Axios API calls — one file per domain
        │   ├── api.ts            # Axios instance + JWT interceptor
        │   ├── authService.ts
        │   ├── eventService.ts
        │   ├── bookingService.ts
        │   ├── vendorService.ts
        │   ├── ticketService.ts
        │   ├── userService.ts
        │   └── reportService.ts
        ├── types/                # TypeScript interfaces (mirrors backend types)
        │   ├── api.ts
        │   ├── event.ts
        │   ├── booking.ts
        │   ├── vendor.ts
        │   ├── ticket.ts
        │   ├── user.ts
        │   └── payment.ts
        └── utils/                # Pure helpers: formatDate, formatCurrency, etc.
```

---

## Domain Entities and Status Enums

| Entity              | Key Statuses                                                    |
| ------------------- | --------------------------------------------------------------- |
| Event               | `DRAFT` → `PENDING_APPROVAL` → `PUBLISHED` / `REJECTED`; organizers may edit and resubmit rejected events; events may be `CANCELLED` or `COMPLETED` |
| Booking             | `CONFIRMED` / `PENDING` / `CANCELLED`                          |
| Payment             | `NOT_REQUIRED` / `PENDING` / `PAID` / `FAILED`                 |
| Ticket              | `ACTIVE` / `USED` / `CANCELLED`                                |
| VendorApplication   | `PENDING_REVIEW` → `APPROVED` / `REJECTED`                     |

Every booking carries a `ticketType` and `paymentStatus` from Phase 1 so Phase 2 payments require no data model changes.

---

## Roles

| Role            | Scope                                                          |
| --------------- | -------------------------------------------------------------- |
| `ATTENDEE`      | Browse events, book, cancel own booking, view own tickets      |
| `VENDOR`        | Apply for stand, pay invoice, manage staff                     |
| `ORGANIZER`     | Create/manage own events, view registrations, check in         |
| `ADMIN`         | Approve events, manage organizer accounts (client-side)        |
| `PLATFORM_ADMIN`| System settings, create first Admin account (our team only)   |
| `MANAGEMENT`    | Read-only reports and analytics                                |

---

## Naming Conventions

| Artifact           | Convention                          | Example                        |
| ------------------ | ----------------------------------- | ------------------------------ |
| React components   | PascalCase                          | `EventCard.tsx`                |
| Pages              | PascalCase, folder per role         | `pages/organizer/CreateEvent.tsx` |
| Hooks              | camelCase, `use` prefix             | `useEvents.ts`                 |
| Services (FE)      | camelCase, `Service` suffix         | `eventService.ts`              |
| Controllers (BE)   | camelCase, `Controller` suffix      | `eventController.ts`           |
| Routes (BE)        | camelCase, `Routes` suffix          | `eventRoutes.ts`               |
| Types/Interfaces   | PascalCase                          | `Event`, `CreateEventDto`      |
| Status enums       | SCREAMING_SNAKE_CASE strings        | `'PENDING_APPROVAL'`           |
| Path aliases       | `@/` maps to `src/` on both sides   | `import { config } from '@/config'` |

---

## Data Flow

```
Frontend Page
  → service (e.g. eventService.ts)
    → Axios (api.ts) — attaches JWT
      → Express route → middleware (authenticate + authorize)
        → Controller → Service → Model → PostgreSQL
          → ApiResponse<T> bubbles back
```

---

## Phase Roadmap

| Phase | Scope                                                                                  |
| ----- | -------------------------------------------------------------------------------------- |
| 1     | Accounts, events (full lifecycle), free bookings, vendor applications (no payment)     |
| 2     | Paid tickets, vendor invoicing + payment, check-in (manual), notifications             |
| 3     | QR check-in, calendar sync, refunds, waiting lists, analytics, AI recommendations     |
