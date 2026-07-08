-- AlterTable
ALTER TABLE "members" ADD COLUMN     "level" VARCHAR(20);

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "level_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roster_share_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roster_share_token" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "events_roster_share_token_key" ON "events"("roster_share_token");
