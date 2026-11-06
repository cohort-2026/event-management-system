ALTER TABLE "vendor_applications"
ADD COLUMN "requested_stand_type" TEXT NOT NULL DEFAULT 'Standard',
ADD COLUMN "requested_stand_size" TEXT NOT NULL DEFAULT 'Not specified',
ADD COLUMN IF NOT EXISTS "stand_description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "supporting_information" TEXT,
ADD COLUMN "assigned_stand" TEXT,
ADD COLUMN "decided_by_id" TEXT,
ADD COLUMN "decided_at" TIMESTAMP(3),
ADD COLUMN "rejection_reason" TEXT;

UPDATE "vendor_applications"
SET "stand_description" = "description";

ALTER TABLE "vendor_applications"
ALTER COLUMN "requested_stand_type" DROP DEFAULT,
ALTER COLUMN "requested_stand_size" DROP DEFAULT;

ALTER TABLE "vendor_applications"
ADD CONSTRAINT "vendor_applications_decided_by_id_fkey"
FOREIGN KEY ("decided_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "vendor_applications_event_id_status_idx"
ON "vendor_applications"("event_id", "status");

CREATE UNIQUE INDEX "vendor_applications_event_id_assigned_stand_approved_key"
ON "vendor_applications"("event_id", "assigned_stand")
WHERE "status" = 'APPROVED' AND "assigned_stand" IS NOT NULL;
