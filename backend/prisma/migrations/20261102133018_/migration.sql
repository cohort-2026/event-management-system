/*
  Warnings:

  - You are about to drop the column `organization_description` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_description";
