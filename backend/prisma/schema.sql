-- ============================================================
-- Event Management System — Database Schema
-- Generated from: prisma/schema.prisma
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM (
  'ATTENDEE',
  'VENDOR',
  'ORGANIZER',
  'ADMIN',
  'PLATFORM_ADMIN',
  'MANAGEMENT'
);

-- Role definitions:
--   ATTENDEE       — registered user who books and attends events
--   VENDOR         — external company applying to provide services at events
--   ORGANIZER      — creates and manages events
--   ADMIN          — manages users and oversees day-to-day operations
--   MANAGEMENT     — read-only oversight and reporting access
--   PLATFORM_ADMIN — full system access, manages admins and platform config

CREATE TYPE "EventStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'PUBLISHED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE "BookingStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'CANCELLED'
);

CREATE TYPE "TicketType" AS ENUM (
  'GENERAL',
  'VIP',
  'STAFF'
);

CREATE TYPE "PaymentProvider" AS ENUM (
  'PAYFAST',
  'STRIPE',
  'PAYPAL'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'PAID',
  'FAILED'
);

CREATE TYPE "TicketStatus" AS ENUM (
  'ACTIVE',
  'USED',
  'CANCELLED'
);

CREATE TYPE "VendorApplicationStatus" AS ENUM (
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED'
);

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE "users" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"          TEXT         NOT NULL,
  "email"         TEXT         NOT NULL,
  "password_hash" TEXT         NOT NULL,
  "role"          "Role"       NOT NULL DEFAULT 'ATTENDEE',
  "is_active"     BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "users_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "users_email_unique"   UNIQUE ("email")
);

CREATE TABLE "events" (
  "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  "title"               TEXT          NOT NULL,
  "description"         TEXT          NOT NULL,
  "category"            TEXT          NOT NULL,
  "venue"               TEXT          NOT NULL,
  "date"                TIMESTAMPTZ   NOT NULL,
  "capacity"            INTEGER       NOT NULL,
  "available_capacity"  INTEGER       NOT NULL,
  "is_free"             BOOLEAN       NOT NULL DEFAULT TRUE,
  "price"               DECIMAL(10,2),
  "status"              "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "rejection_reason"    TEXT,
  "reviewed_by_id"      UUID,
  "reviewed_at"         TIMESTAMPTZ,
  "organizer_id"        UUID          NOT NULL,
  "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ   NOT NULL,

  CONSTRAINT "events_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id"),
  CONSTRAINT "events_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "bookings" (
  "id"             UUID            NOT NULL DEFAULT gen_random_uuid(),
  "ticket_type"    TEXT            NOT NULL,
  "status"         "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "event_id"       UUID            NOT NULL,
  "attendee_id"    UUID            NOT NULL,
  "created_at"     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT "bookings_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "bookings_event_id_fkey"    FOREIGN KEY ("event_id")    REFERENCES "events"("id"),
  CONSTRAINT "bookings_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "users"("id")
);

CREATE TABLE "tickets" (
  "id"               UUID           NOT NULL DEFAULT gen_random_uuid(),
  "reference_number" TEXT           NOT NULL,
  "type"             "TicketType"   NOT NULL,
  "status"           "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
  "booking_id"       UUID           NOT NULL,
  "event_id"         UUID           NOT NULL,
  "holder_id"        UUID           NOT NULL,
  "issued_at"        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "tickets_pkey"                PRIMARY KEY ("id"),
  CONSTRAINT "tickets_reference_number_key" UNIQUE ("reference_number"),
  CONSTRAINT "tickets_booking_id_key"      UNIQUE ("booking_id"),
  CONSTRAINT "tickets_booking_id_fkey"     FOREIGN KEY ("booking_id") REFERENCES "bookings"("id"),
  CONSTRAINT "tickets_event_id_fkey"       FOREIGN KEY ("event_id")   REFERENCES "events"("id"),
  CONSTRAINT "tickets_holder_id_fkey"      FOREIGN KEY ("holder_id")  REFERENCES "users"("id")
);

CREATE TABLE "payments" (
  "id"                 UUID            NOT NULL DEFAULT gen_random_uuid(),
  "amount"             DECIMAL(10,2)   NOT NULL,
  "currency"           TEXT            NOT NULL DEFAULT 'ZAR',
  "status"             "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider"           "PaymentProvider" NOT NULL,
  "provider_reference" TEXT,
  "booking_id"         UUID            NOT NULL,
  "created_at"         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT "payments_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "payments_booking_id_key" UNIQUE ("booking_id"),
  CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
);

CREATE TABLE "vendor_applications" (
  "id"                  UUID                      NOT NULL DEFAULT gen_random_uuid(),
  "company_name"        TEXT                      NOT NULL,
  "registration_number" TEXT                      NOT NULL,
  "description"         TEXT                      NOT NULL,
  "status"              "VendorApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "invoice_id"          TEXT,
  "event_id"            UUID                      NOT NULL,
  "vendor_id"           UUID                      NOT NULL,
  "created_at"          TIMESTAMPTZ               NOT NULL DEFAULT NOW(),

  CONSTRAINT "vendor_applications_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "vendor_applications_event_id_fkey"  FOREIGN KEY ("event_id")  REFERENCES "events"("id"),
  CONSTRAINT "vendor_applications_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id")
);

CREATE TABLE "vendor_staff_members" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"           TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "entry_pass_id"  TEXT NOT NULL,
  "application_id" UUID NOT NULL,

  CONSTRAINT "vendor_staff_members_pkey"               PRIMARY KEY ("id"),
  CONSTRAINT "vendor_staff_members_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "vendor_applications"("id")
);
