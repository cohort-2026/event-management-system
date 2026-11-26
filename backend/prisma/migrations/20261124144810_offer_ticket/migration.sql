-- AlterTable
ALTER TABLE "waitlist_entries" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "offered_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "waitlist_entries_expires_at_idx" ON "waitlist_entries"("expires_at");
