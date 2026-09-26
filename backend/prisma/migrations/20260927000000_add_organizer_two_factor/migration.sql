-- AlterTable
ALTER TABLE "organizer_accounts"
  ADD COLUMN "two_factor_code_hash" VARCHAR(100),
  ADD COLUMN "two_factor_code_expires_at" TIMESTAMP(3),
  ADD COLUMN "two_factor_attempts" INTEGER NOT NULL DEFAULT 0;
