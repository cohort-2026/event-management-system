-- Link a waitlist offer to the booking created when the attendee claims it.
ALTER TABLE "bookings" ADD COLUMN "waitlist_entry_id" TEXT;
CREATE UNIQUE INDEX "bookings_waitlist_entry_id_key" ON "bookings"("waitlist_entry_id");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_waitlist_entry_id_fkey"
  FOREIGN KEY ("waitlist_entry_id") REFERENCES "waitlist_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
