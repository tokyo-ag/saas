-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "stripe_publishable_key" VARCHAR(200),
ADD COLUMN     "stripe_secret_key" TEXT,
ADD COLUMN     "stripe_webhook_secret" TEXT;
