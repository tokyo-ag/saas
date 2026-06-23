ALTER TABLE "public_pages"
ADD COLUMN IF NOT EXISTS "nav_color"           VARCHAR(20),
ADD COLUMN IF NOT EXISTS "image_layout"        VARCHAR(20),
ADD COLUMN IF NOT EXISTS "reserve_view_style"  VARCHAR(20);

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    TEXT NOT NULL,
  "title"        VARCHAR(160) NOT NULL,
  "slug"         VARCHAR(120) NOT NULL,
  "body"         TEXT NOT NULL,
  "excerpt"      VARCHAR(300),
  "status"       VARCHAR(20) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blog_posts_tenant_id_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "blog_posts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "blog_posts_tenant_id_status_published_at_idx"
  ON "blog_posts" ("tenant_id", "status", "published_at" DESC);
