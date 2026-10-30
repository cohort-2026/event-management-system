ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP(3);

UPDATE "events"
SET "start_time" = COALESCE("start_time", "date"),
    "end_time" = COALESCE("end_time", "date" + INTERVAL '1 hour');

ALTER TABLE "events"
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL;
