ALTER TYPE "EventStatus" ADD VALUE 'REJECTED';

CREATE TYPE "EventType" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID');

ALTER TABLE "events"
ADD COLUMN "start_time" TIMESTAMP(3),
ADD COLUMN "end_time" TIMESTAMP(3),
ADD COLUMN "event_type" "EventType" NOT NULL DEFAULT 'IN_PERSON',
ADD COLUMN "meeting_details" TEXT,
ADD COLUMN "banner_image_url" TEXT;

UPDATE "events"
SET "start_time" = "date",
    "end_time" = "date" + INTERVAL '1 hour';

ALTER TABLE "events"
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL;

CREATE TABLE "event_ticket_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,

    CONSTRAINT "event_ticket_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "event_ticket_types_event_id_idx" ON "event_ticket_types"("event_id");

INSERT INTO "event_ticket_types" ("id", "name", "price", "quantity", "available_quantity", "event_id")
SELECT
    'legacy-' || "id",
    CASE WHEN "is_free" THEN 'Free admission' ELSE 'General admission' END,
    COALESCE("price", 0),
    "capacity",
    "available_capacity",
    "id"
FROM "events";
