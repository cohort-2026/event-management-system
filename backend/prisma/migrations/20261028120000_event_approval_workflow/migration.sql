ALTER TYPE "EventStatus" ADD VALUE 'REJECTED';

ALTER TABLE "events"
ADD COLUMN "reviewed_by_id" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3);

ALTER TABLE "events"
ADD CONSTRAINT "events_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
