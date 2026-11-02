/*
  Warnings:

  - You are about to drop the column `profile_approval_status` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "profile_approval_status";

-- DropEnum
DROP TYPE "ProfileApprovalStatus";
