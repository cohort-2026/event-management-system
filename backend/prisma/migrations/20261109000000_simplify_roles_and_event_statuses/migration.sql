-- ─── Step 1: Remove existing column defaults ────────────────────────────────
-- Required before changing PostgreSQL enum types.
ALTER TABLE "users"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "events"
  ALTER COLUMN "status" DROP DEFAULT;


-- ─── Step 2: Remap obsolete Role values before removing them ────────────────
-- PLATFORM_ADMIN → ADMIN
-- MANAGEMENT → ADMIN

UPDATE "users"
SET "role" = 'ADMIN'::"Role"
WHERE "role" IN (
  'PLATFORM_ADMIN'::"Role",
  'MANAGEMENT'::"Role"
);


-- ─── Step 3: Remap obsolete EventStatus values before removing them ─────────
-- PENDING_APPROVAL → DRAFT
-- REJECTED → DRAFT

UPDATE "events"
SET "status" = 'DRAFT'::"EventStatus"
WHERE "status" IN (
  'PENDING_APPROVAL'::"EventStatus",
  'REJECTED'::"EventStatus"
);


-- ─── Step 4: Drop obsolete rejection_reason column ─────────────────────────
ALTER TABLE "events"
  DROP COLUMN IF EXISTS "rejection_reason";


-- ─── Step 5: Rebuild Role enum without obsolete roles ───────────────────────
ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM (
  'ATTENDEE',
  'VENDOR',
  'ORGANIZER',
  'ADMIN'
);

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING "role"::text::"Role";

DROP TYPE "Role_old";


-- Restore the new default
ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'ATTENDEE'::"Role";


-- ─── Step 6: Rebuild EventStatus enum ───────────────────────────────────────
ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";

CREATE TYPE "EventStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'CANCELLED',
  'COMPLETED'
);

ALTER TABLE "events"
  ALTER COLUMN "status" TYPE "EventStatus"
  USING "status"::text::"EventStatus";

DROP TYPE "EventStatus_old";


-- Restore the new default
ALTER TABLE "events"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"EventStatus";