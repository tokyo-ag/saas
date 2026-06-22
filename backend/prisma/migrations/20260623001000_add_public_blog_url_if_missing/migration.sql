ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "public_blog_url" VARCHAR(500);
