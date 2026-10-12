ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'pending_approval';

ALTER TABLE "events"
ADD COLUMN "bell_approval_required" BOOLEAN NOT NULL DEFAULT false;
