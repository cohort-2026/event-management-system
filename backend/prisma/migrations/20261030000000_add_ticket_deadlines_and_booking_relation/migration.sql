ALTER TABLE "event_ticket_types"
ADD COLUMN "booking_deadline" TIMESTAMP(3);

ALTER TABLE "bookings"
ADD COLUMN "event_ticket_type_id" TEXT;

CREATE INDEX "bookings_event_ticket_type_id_idx" ON "bookings"("event_ticket_type_id");

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_event_ticket_type_id_fkey"
FOREIGN KEY ("event_ticket_type_id") REFERENCES "event_ticket_types"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
