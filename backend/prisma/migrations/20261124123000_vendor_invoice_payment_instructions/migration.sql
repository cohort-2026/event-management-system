ALTER TABLE "events"
ADD COLUMN "vendor_payment_instructions" TEXT NOT NULL DEFAULT '';

ALTER TABLE "vendor_invoices"
ADD COLUMN "payment_instructions" TEXT NOT NULL DEFAULT '';
