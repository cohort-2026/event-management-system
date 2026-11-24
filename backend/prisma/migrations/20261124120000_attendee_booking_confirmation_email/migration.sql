ALTER TABLE "bookings"
ADD COLUMN "ticket_access_token" TEXT,
ADD COLUMN "confirmation_email_attempted_at" TIMESTAMP(3),
ADD COLUMN "confirmation_email_sent_at" TIMESTAMP(3);

UPDATE "bookings"
SET "ticket_access_token" = gen_random_uuid()::text
WHERE "ticket_access_token" IS NULL;

ALTER TABLE "bookings"
ALTER COLUMN "ticket_access_token" SET NOT NULL;

CREATE UNIQUE INDEX "bookings_ticket_access_token_key"
ON "bookings"("ticket_access_token");
