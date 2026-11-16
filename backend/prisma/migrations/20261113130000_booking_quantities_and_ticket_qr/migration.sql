BEGIN;

ALTER TABLE "bookings"
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "quantity" INTEGER,
  ADD COLUMN "total_amount" DECIMAL(10,2),
  ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "bookings" AS booking
SET
  "reference" = 'BKG-' || UPPER(REPLACE(booking."id", '-', '')),
  "quantity" = GREATEST(
    1,
    (SELECT COUNT(*) FROM "tickets" AS ticket WHERE ticket."booking_id" = booking."id")
  ),
  "total_amount" = COALESCE(
    (SELECT payment."amount" FROM "payments" AS payment WHERE payment."booking_id" = booking."id"),
    0
  ),
  "updated_at" = booking."created_at";

ALTER TABLE "bookings"
  ALTER COLUMN "reference" SET NOT NULL,
  ALTER COLUMN "quantity" SET DEFAULT 1,
  ALTER COLUMN "quantity" SET NOT NULL,
  ALTER COLUMN "total_amount" SET DEFAULT 0,
  ALTER COLUMN "total_amount" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");
CREATE INDEX "bookings_attendee_id_created_at_idx" ON "bookings"("attendee_id", "created_at");

ALTER TABLE "tickets"
  ADD COLUMN "qr_payload" TEXT,
  ADD COLUMN "checked_in_at" TIMESTAMP(3);

UPDATE "tickets"
SET "qr_payload" = 'QR-' || "reference_number";

ALTER TABLE "tickets"
  ALTER COLUMN "qr_payload" SET NOT NULL;

DROP INDEX "tickets_booking_id_key";
CREATE INDEX "tickets_booking_id_idx" ON "tickets"("booking_id");
CREATE UNIQUE INDEX "tickets_qr_payload_key" ON "tickets"("qr_payload");

COMMIT;
