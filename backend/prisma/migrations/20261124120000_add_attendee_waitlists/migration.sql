CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CLAIMED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "event_id" TEXT NOT NULL,
    "ticket_type_id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,
    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "waitlist_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "waitlist_entries_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "event_ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "waitlist_entries_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "waitlist_entries_event_id_ticket_type_id_status_position_created_at_id_idx" ON "waitlist_entries"("event_id", "ticket_type_id", "status", "position", "created_at", "id");
CREATE INDEX "waitlist_entries_attendee_id_created_at_idx" ON "waitlist_entries"("attendee_id", "created_at");
CREATE INDEX "waitlist_entries_ticket_type_id_status_idx" ON "waitlist_entries"("ticket_type_id", "status");
CREATE UNIQUE INDEX "waitlist_entries_one_active_per_attendee_idx" ON "waitlist_entries"("attendee_id", "event_id", "ticket_type_id") WHERE "status" IN ('WAITING', 'OFFERED');
