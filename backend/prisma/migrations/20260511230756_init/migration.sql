-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('waiting_payment', 'reserved', 'waitlisted', 'attended', 'cancelled');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'standard');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "line_channel_id" VARCHAR(100),
    "line_channel_secret" VARCHAR(100),
    "line_channel_access_token" TEXT,
    "liff_id" VARCHAR(100),
    "stripe_account_id" VARCHAR(100),
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "plan_started_at" TIMESTAMP(3),
    "stripe_customer_id" VARCHAR(100),
    "stripe_subscription_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "held_at" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "capacity" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "price" INTEGER NOT NULL DEFAULT 0,
    "payment_required" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_reserve" BOOLEAN NOT NULL DEFAULT true,
    "remind_enabled" BOOLEAN NOT NULL DEFAULT false,
    "remind_at" TIMESTAMP(3),
    "reminded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "line_user_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100),
    "grade" VARCHAR(50),
    "gender" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'reserved',
    "waitlist_order" INTEGER,
    "stripe_payment_intent_id" VARCHAR(100),
    "paid_at" TIMESTAMP(3),
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_tenant_id_line_user_id_key" ON "members"("tenant_id", "line_user_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
