-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "staff_view_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staff_view_token" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_staff_view_token_key" ON "tenants"("staff_view_token");
