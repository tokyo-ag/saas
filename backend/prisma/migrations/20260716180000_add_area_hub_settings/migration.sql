-- CreateTable
CREATE TABLE "area_hub_settings" (
    "id" TEXT NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "area" VARCHAR(60) NOT NULL DEFAULT '',
    "description" TEXT,
    "faq_enabled" BOOLEAN,
    "related_article_limit" INTEGER,
    "nearby_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "indexable" BOOLEAN,
    "seo_title" VARCHAR(160),
    "seo_description" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_hub_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "area_hub_settings_category_area_key" ON "area_hub_settings"("category", "area");
