CREATE TYPE "VendorInvoiceEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "vendor_invoices"
ADD COLUMN "email_status" "VendorInvoiceEmailStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "email_sent_at" TIMESTAMP(3);
