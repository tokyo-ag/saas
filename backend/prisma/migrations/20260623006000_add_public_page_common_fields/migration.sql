ALTER TABLE "public_pages"
ADD COLUMN IF NOT EXISTS "background_color" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "about_label" VARCHAR(40),
ADD COLUMN IF NOT EXISTS "reserve_label" VARCHAR(40),
ADD COLUMN IF NOT EXISTS "blog_label" VARCHAR(40);

UPDATE "public_pages"
SET "status" = 'published',
    "published_at" = COALESCE("published_at", NOW())
WHERE "status" = 'draft';

ALTER TABLE "public_pages"
ALTER COLUMN "status" SET DEFAULT 'published';
