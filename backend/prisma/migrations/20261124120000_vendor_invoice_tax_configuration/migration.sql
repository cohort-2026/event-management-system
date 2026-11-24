ALTER TABLE "events"
ADD COLUMN "vendor_tax_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "vendor_invoices"
ADD COLUMN "subtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
ADD COLUMN "tax_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "vendor_invoices"
SET "subtotal" = "amount";
