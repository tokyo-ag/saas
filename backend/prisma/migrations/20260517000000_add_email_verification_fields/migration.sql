-- AlterTable: add email verification and password reset fields to organizer_accounts
ALTER TABLE "organizer_accounts" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "organizer_accounts" ADD COLUMN "email_verification_token" VARCHAR(200);
ALTER TABLE "organizer_accounts" ADD COLUMN "password_reset_token" VARCHAR(200);
ALTER TABLE "organizer_accounts" ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_email_verification_token_key" ON "organizer_accounts"("email_verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_password_reset_token_key" ON "organizer_accounts"("password_reset_token");
