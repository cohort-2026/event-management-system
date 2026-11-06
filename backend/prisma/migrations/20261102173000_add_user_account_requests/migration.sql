CREATE TYPE "UserRequestRole" AS ENUM ('ATTENDEE', 'VENDOR', 'ORGANIZER');
CREATE TYPE "UserRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "user_requests" (
    "id" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRequestRole" NOT NULL,
    "status" "UserRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "user_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_requests_status_created_at_idx" ON "user_requests"("status", "created_at");
