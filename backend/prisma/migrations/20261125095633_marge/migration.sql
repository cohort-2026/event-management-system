/*
  Warnings:

  - You are about to drop the column `booking_id` on the `waitlist_entries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "waitlist_entries" DROP CONSTRAINT "waitlist_entries_booking_id_fkey";

-- DropIndex
DROP INDEX "waitlist_entries_booking_id_key";

-- AlterTable
ALTER TABLE "waitlist_entries" DROP COLUMN "booking_id";
