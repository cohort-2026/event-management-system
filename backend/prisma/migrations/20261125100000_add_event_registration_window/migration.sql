ALTER TABLE "events"
  ADD COLUMN "registration_opens_at" TIMESTAMP(3),
  ADD COLUMN "registration_closes_at" TIMESTAMP(3);

UPDATE "events"
SET
  "registration_opens_at" = COALESCE("created_at", NOW()),
  "registration_closes_at" = "start_time"
WHERE "registration_opens_at" IS NULL OR "registration_closes_at" IS NULL;
