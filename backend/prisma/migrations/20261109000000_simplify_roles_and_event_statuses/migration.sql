-- ─── Step 1: Remap obsolete Role values before removing them ─────────────────
-- PLATFORM_ADMIN → ADMIN, MANAGEMENT → ADMIN
UPDATE "users"
SET "role" = 'ADMIN'::"Role"
WHERE "role" IN ('PLATFORM_ADMIN'::"Role", 'MANAGEMENT'::"Role");

-- ─── Step 2: Remap obsolete EventStatus values before removing them ───────────
-- PENDING_APPROVAL → DRAFT (event was awaiting review; safest fallback is draft)
-- REJECTED → DRAFT (organizer can review feedback stored in rejection_reason and resubmit)
UPDATE "events"
SET "status" = 'DRAFT'::"EventStatus"
WHERE "status" IN ('PENDING_APPROVAL'::"EventStatus", 'REJECTED'::"EventStatus");

-- ─── Step 3: Drop rejection_reason column (no longer needed after status remap) ─
-- Destructive: this column held rejection feedback text.
-- All REJECTED events have been moved to DRAFT above, so the data is no longer
-- actionable under the new schema. The column is dropped after the status remap.
ALTER TABLE "events" DROP COLUMN IF EXISTS "rejection_reason";

-- ─── Step 4: Rebuild the Role enum without PLATFORM_ADMIN and MANAGEMENT ──────
-- PostgreSQL does not support DROP VALUE on enums; the standard approach is to
-- rename the old type, create the new one, migrate the column, then drop the old.
ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('ATTENDEE', 'VENDOR', 'ORGANIZER', 'ADMIN');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
    USING "role"::text::"Role";

DROP TYPE "Role_old";

-- ─── Step 5: Rebuild the EventStatus enum without PENDING_APPROVAL and REJECTED ─
ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";

CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

ALTER TABLE "events"
  ALTER COLUMN "status" TYPE "EventStatus"
    USING "status"::text::"EventStatus";

DROP TYPE "EventStatus_old";
