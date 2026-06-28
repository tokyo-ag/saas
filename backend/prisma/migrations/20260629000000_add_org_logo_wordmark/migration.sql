ALTER TABLE "public_pages"
  ADD COLUMN IF NOT EXISTS "org_name_display_type" VARCHAR(20) NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS "org_logo_wordmark_url"  TEXT,
  ADD COLUMN IF NOT EXISTS "org_logo_wordmark_alt"  VARCHAR(200);
