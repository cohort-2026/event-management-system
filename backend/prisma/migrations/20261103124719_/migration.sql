/*
  Warnings:

  - You are about to drop the column `profile_rejection_reason` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profile_reviewed_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profile_reviewed_by_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `user_requests` table. If the table is not empty, all the data it contains will be lost.

*/
ALTER TABLE "users" DROP CONSTRAINT "users_profile_reviewed_by_id_fkey";

ALTER TABLE "users" DROP COLUMN "profile_rejection_reason",
DROP COLUMN "profile_reviewed_at",
DROP COLUMN "profile_reviewed_by_id";

DROP TABLE "user_requests";

DROP TYPE "UserRequestRole";
DROP TYPE "UserRequestStatus";
