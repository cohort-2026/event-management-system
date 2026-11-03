CREATE TYPE "VendorProfileStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

ALTER TABLE "vendor_profiles"
ADD COLUMN "status" "VendorProfileStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "reviewed_at" TIMESTAMP(3);