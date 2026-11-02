CREATE TYPE "ProfileApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED');

ALTER TABLE "users"
ADD COLUMN "profile_approval_status" "ProfileApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL';
