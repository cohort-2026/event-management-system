ALTER TABLE "bookings"
    ADD COLUMN "cancelled_at" TIMESTAMP(3),
    ADD COLUMN "cancellation_reason" TEXT,
    ADD COLUMN "cancelled_by_id" TEXT;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_cancelled_by_id_fkey"
    FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "bookings_cancelled_at_idx" ON "bookings"("cancelled_at");
ALTER TABLE "audit_logs" ADD COLUMN "metadata" JSONB;
