-- AlterTable
ALTER TABLE "official_articles" ADD COLUMN     "area_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_pillar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pillar_slug" VARCHAR(120);

-- CreateIndex
CREATE INDEX "official_articles_pillar_slug_idx" ON "official_articles"("pillar_slug");
