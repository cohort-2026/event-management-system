CREATE TYPE "ReminderDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "events"
  ADD COLUMN "directions" TEXT,
  ADD COLUMN "parking_information" TEXT;

CREATE TABLE "event_reminder_deliveries" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "status" "ReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_reminder_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_reminder_deliveries_booking_id_key" ON "event_reminder_deliveries"("booking_id");
CREATE INDEX "event_reminder_deliveries_event_id_status_idx" ON "event_reminder_deliveries"("event_id", "status");

ALTER TABLE "event_reminder_deliveries"
  ADD CONSTRAINT "event_reminder_deliveries_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_reminder_deliveries"
  ADD CONSTRAINT "event_reminder_deliveries_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
