ALTER TABLE "users"
ADD COLUMN "profile_reviewed_by_id" TEXT,
ADD COLUMN "profile_reviewed_at" TIMESTAMP(3);

ALTER TABLE "users"
ADD CONSTRAINT "users_profile_reviewed_by_id_fkey"
FOREIGN KEY ("profile_reviewed_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
