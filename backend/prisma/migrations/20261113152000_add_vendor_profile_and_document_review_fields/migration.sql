CREATE TYPE "VendorDocumentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

ALTER TABLE "vendor_profiles"
ADD COLUMN "business_type" TEXT NOT NULL DEFAULT '',
ADD COLUMN "business_address" TEXT NOT NULL DEFAULT '';

ALTER TABLE "vendor_documents"
ADD COLUMN "status" "VendorDocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_id" TEXT,
ADD COLUMN "rejection_reason" TEXT;

ALTER TABLE "vendor_documents"
ADD CONSTRAINT "vendor_documents_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "vendor_documents_vendor_id_status_idx"
ON "vendor_documents"("vendor_id", "status");
