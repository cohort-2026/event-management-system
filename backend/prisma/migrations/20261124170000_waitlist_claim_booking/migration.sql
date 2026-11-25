ALTER TABLE "waitlist_entries"
    ADD COLUMN "booking_id" TEXT;

CREATE UNIQUE INDEX "waitlist_entries_booking_id_key"
    ON "waitlist_entries"("booking_id");

ALTER TABLE "waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
