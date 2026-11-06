CREATE TYPE "VendorInvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID');

ALTER TABLE "events"
ADD COLUMN "vendor_stand_rate_per_sqm" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "vendor_applications"
ADD COLUMN "stand_area_sqm" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "stand_rate_per_sqm" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "quoted_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE "vendor_invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "VendorInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_invoices_invoice_number_key" ON "vendor_invoices"("invoice_number");
CREATE UNIQUE INDEX "vendor_applications_invoice_id_key" ON "vendor_applications"("invoice_id");

ALTER TABLE "vendor_applications"
ADD CONSTRAINT "vendor_applications_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;