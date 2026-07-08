-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "member_roster_share_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "member_roster_share_token" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_member_roster_share_token_key" ON "tenants"("member_roster_share_token");
