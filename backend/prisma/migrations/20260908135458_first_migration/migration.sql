-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ATTENDEE', 'VENDOR', 'ORGANIZER', 'ADMIN', 'PLATFORM_ADMIN', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketTypes" AS ENUM ('GENERAL', 'VIP', 'STAFF');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYFAST', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TypeOfTickets" AS ENUM ('PAID', 'FREE');

-- CreateEnum
CREATE TYPE "VendorApplicationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ATTENDEE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "available_capacity" INTEGER NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organizer_id" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "ticket_type" "TicketTypes" NOT NULL DEFAULT 'GENERAL',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,
    "attendee_id" TEXT NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "type_of_ticket" "TypeOfTickets" NOT NULL DEFAULT 'FREE',
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "holder_id" TEXT NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_id" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_applications" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "VendorApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,

    CONSTRAINT "vendor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_staff_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "entry_pass_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,

    CONSTRAINT "vendor_staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_reference_number_key" ON "tickets"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_booking_id_key" ON "tickets"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_staff_members" ADD CONSTRAINT "vendor_staff_members_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "vendor_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
