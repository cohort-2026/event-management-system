-- AlterTable
ALTER TABLE "vendor_applications"
ADD COLUMN IF NOT EXISTS "stand_description" TEXT NOT NULL DEFAULT '';

ALTER TABLE "vendor_applications" ALTER COLUMN "stand_description" DROP DEFAULT;
