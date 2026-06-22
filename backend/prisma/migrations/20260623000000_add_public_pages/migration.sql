CREATE TABLE "public_pages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "body" TEXT NOT NULL,
  "cover_image_url" TEXT,
  "seo_title" VARCHAR(160),
  "seo_description" VARCHAR(300),
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "public_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_pages_tenant_id_slug_key" ON "public_pages"("tenant_id", "slug");
CREATE INDEX "public_pages_tenant_id_status_idx" ON "public_pages"("tenant_id", "status");

ALTER TABLE "public_pages"
  ADD CONSTRAINT "public_pages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
