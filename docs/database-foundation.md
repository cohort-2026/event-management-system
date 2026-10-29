# Database Foundation — Authentication & Authorization

## Overview

This document covers the database foundation for the Event Management System. It describes the schema design, all entities and their relationships, role definitions, seed accounts, security decisions, and setup instructions.

---

## Technology Stack

| Tool | Version | Purpose |
|---|---|---|
| PostgreSQL | 14+ | Relational database |
| Prisma ORM | 5.22.0 | Schema management, migrations, client |
| bcryptjs | 3.x | Password hashing |
| ts-node | 2.x | Running seed script in TypeScript |

---

## Schema Design

### Entity Relationship Overview

```
User ──< Event          (one organizer → many events)
User ──< Booking        (one attendee → many bookings)
User ──< Ticket         (one holder → many tickets)
User ──< VendorApplication (one vendor → many applications)

Event ──< Booking
Event ──< Ticket
Event ──< VendorApplication

Booking ──── Ticket     (one-to-one)
Booking ──── Payment    (one-to-one)

VendorApplication ──< VendorStaffMember
```

---

## Tables

### `users`

The central authentication and authorization table.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | Auto-generated |
| `firstname` | TEXT | NOT NULL | — |
| `lastname` | TEXT | NOT NULL | — |
| `email` | TEXT | NOT NULL, UNIQUE | Enforced at DB level |
| `password_hash` | TEXT | NOT NULL | bcrypt hash, never plain text |
| `role` | Role (enum) | NOT NULL, DEFAULT `ATTENDEE` | See role definitions below |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `true` | Soft disable accounts |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | — |

---

### `events`

Stores all event information created by organisers.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | — |
| `title` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `category` | TEXT | NOT NULL | — |
| `venue` | TEXT | NOT NULL | — |
| `date` | TIMESTAMPTZ | NOT NULL | — |
| `capacity` | INTEGER | NOT NULL | Total seats |
| `available_capacity` | INTEGER | NOT NULL | Decrements on booking |
| `is_free` | BOOLEAN | NOT NULL, DEFAULT `true` | — |
| `price` | DECIMAL(10,2) | NULLABLE | Null when free |
| `status` | EventStatus (enum) | NOT NULL, DEFAULT `DRAFT` | — |
| `rejection_reason` | TEXT | NULLABLE | Required when status = `REJECTED`; shown to the organizer |
| `reviewed_by_id` | UUID | NULLABLE, FK → users | Admin who made the latest approval/rejection decision |
| `reviewed_at` | TIMESTAMPTZ | NULLABLE | Time of the latest approval/rejection decision |
| `organizer_id` | UUID | NOT NULL, FK → users | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Auto-updated by Prisma |

---

### `bookings`

Records an attendee's registration for an event.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | — |
| `ticket_type` | TicketTypes (enum) | NOT NULL, DEFAULT `GENERAL` | GENERAL, VIP, STAFF |
| `status` | BookingStatus (enum) | NOT NULL, DEFAULT `PENDING` | — |
| `payment_status` | PaymentStatus (enum) | NOT NULL, DEFAULT `NOT_REQUIRED` | — |
| `event_id` | UUID | NOT NULL, FK → events | — |
| `attendee_id` | UUID | NOT NULL, FK → users | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

---

### `tickets`

Issued after a booking is confirmed.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | — |
| `reference_number` | TEXT | NOT NULL, UNIQUE | Human-readable ticket ref |
| `type_of_ticket` | TypeOfTickets (enum) | NOT NULL, DEFAULT `FREE` | PAID or FREE |
| `status` | TicketStatus (enum) | NOT NULL, DEFAULT `ACTIVE` | — |
| `booking_id` | UUID | NOT NULL, UNIQUE, FK → bookings | One ticket per booking |
| `event_id` | UUID | NOT NULL, FK → events | — |
| `holder_id` | UUID | NOT NULL, FK → users | — |
| `issued_at` | TIMESTAMPTZ | NOT NULL | — |

---

### `payments`

Tracks payment for a paid booking.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | — |
| `amount` | DECIMAL(10,2) | NOT NULL | — |
| `currency` | TEXT | NOT NULL, DEFAULT `ZAR` | — |
| `status` | PaymentStatus (enum) | NOT NULL, DEFAULT `PENDING` | — |
| `provider` | TEXT | NOT NULL | e.g. PayFast, Stripe |
| `provider_reference` | TEXT | NULLABLE | External payment ID |
| `booking_id` | UUID | NOT NULL, UNIQUE, FK → bookings | One payment per booking |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

---

### `vendor_applications`

A vendor's application to provide services at a specific event.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | — |
| `company_name` | TEXT | NOT NULL | — |
| `registration_number` | TEXT | NOT NULL | — |
| `description` | TEXT | NOT NULL | — |
| `status` | VendorApplicationStatus (enum) | NOT NULL, DEFAULT `PENDING_REVIEW` | — |
| `invoice_id` | TEXT | NULLABLE | Set after approval |
| `event_id` | UUID | NOT NULL, FK → events | — |
| `vendor_id` | UUID | NOT NULL, FK → users | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

---

### `vendor_staff_members`

Staff members submitted as part of a vendor application.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | — |
| `name` | TEXT | NOT NULL | — |
| `email` | TEXT | NOT NULL | — |
| `entry_pass_id` | TEXT | NOT NULL | Linked to a physical/digital pass |
| `application_id` | UUID | NOT NULL, FK → vendor_applications | — |

---

## Enums

### `Role` — User Roles

| Value | Description |
|---|---|
| `ATTENDEE` | Registered user who browses and books events |
| `VENDOR` | External company applying to provide services at events |
| `ORGANIZER` | Creates, manages and publishes events |
| `ADMIN` | Manages users and oversees day-to-day platform operations |
| `MANAGEMENT` | Read-only oversight, reporting and analytics access |
| `PLATFORM_ADMIN` | Full system access — manages admins and platform configuration |

### `EventStatus`

| Value | Description |
|---|---|
| `DRAFT` | Created but not yet submitted |
| `PENDING_APPROVAL` | Submitted, awaiting admin review |
| `PUBLISHED` | Approved, live and open for bookings (`APPROVED` is represented by this existing project status) |
| `REJECTED` | Rejected with required feedback; organizer may edit and resubmit |
| `CANCELLED` | Cancelled by organiser or admin |
| `COMPLETED` | Event has taken place |

### `BookingStatus`

`PENDING` → `CONFIRMED` → `CANCELLED`

### `PaymentStatus`

`NOT_REQUIRED` | `PENDING` → `PAID` | `FAILED`

### `TicketTypes` (booking ticket category)

`GENERAL` | `VIP` | `STAFF`

### `TypeOfTickets` (ticket pricing type)

`FREE` | `PAID`

### `TicketStatus`

`ACTIVE` → `USED` | `CANCELLED`

### `VendorApplicationStatus`

`PENDING_REVIEW` → `APPROVED` | `REJECTED`

---

## Security Decisions

| Requirement | Implementation |
|---|---|
| Never store plain-text passwords | `bcryptjs` with 12 salt rounds |
| Email uniqueness | `UNIQUE` constraint on `users.email` at database level |
| No secrets committed | `DATABASE_URL` and `JWT_SECRET` live in `.env` which is in `.gitignore` |
| Column named `password_hash` | Explicitly avoids any field named `password` |

---

## Seed Accounts

One account is seeded per role for development and testing. Passwords are bcrypt-hashed before insertion — plain-text passwords are never stored.

| Role | Email | Password |
|---|---|---|
| `PLATFORM_ADMIN` | platform.admin@example.com | PlatformAdmin@123 |
| `ADMIN` | admin@example.com | Admin@123 |
| `MANAGEMENT` | management@example.com | Management@123 |
| `ORGANIZER` | organizer@example.com | Organizer@123 |
| `VENDOR` | vendor@example.com | Vendor@123 |
| `ATTENDEE` | attendee@example.com | Attendee@123 |

> These credentials are for development only. Replace them before any staging or production deployment.

The seed uses `upsert` so it is safe to run multiple times without creating duplicates.

---

## File Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Prisma ORM schema — source of truth
│   ├── schema.sql          # Committed SQL schema for reference
│   └── seed.ts             # Seeds one account per role
├── tsconfig.seed.json      # TypeScript config used by the seed script
└── .env                    # DATABASE_URL and secrets (not committed)
```

---

## Setup Instructions

### 1. Configure the database connection

Edit `backend/.env` and replace the placeholder with your real credentials:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/event_management_db"
```

### 2. Run the migration

Creates all tables in the database:

```bash
cd backend
npm run db:migrate
```

When prompted, enter a migration name e.g. `init`.

### 3. Generate the Prisma client

```bash
npm run db:generate
```

### 4. Seed the database

```bash
npx prisma db seed
```

Expected output:

```
Seeding users...
  ✓ PLATFORM_ADMIN — platform.admin@example.com
  ✓ ADMIN — admin@example.com
  ✓ MANAGEMENT — management@example.com
  ✓ ORGANIZER — organizer@example.com
  ✓ VENDOR — vendor@example.com
  ✓ ATTENDEE — attendee@example.com
Seeding complete.
```

### 5. Inspect the database (optional)

```bash
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555` to browse all tables.

---

## Acceptance Criteria Checklist

- [x] `users` table exists with all required columns
- [x] `email` has a `UNIQUE` constraint enforced at database level
- [x] `password_hash` column used — no `password` column exists
- [x] All six roles are defined in the `Role` enum
- [x] SQL schema committed to the repository at `prisma/schema.sql`
- [x] Seed accounts available for all roles
- [x] Passwords are bcrypt-hashed — no plain-text passwords stored
- [x] No secrets committed to the repository
