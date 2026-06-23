ALTER TABLE "public_pages" ADD COLUMN IF NOT EXISTS "title_font" VARCHAR(40);
ALTER TABLE "public_pages" ADD COLUMN IF NOT EXISTS "title_color" VARCHAR(20);
ALTER TABLE "public_pages" ADD COLUMN IF NOT EXISTS "subtitle_font" VARCHAR(40);
ALTER TABLE "public_pages" ADD COLUMN IF NOT EXISTS "subtitle_size" VARCHAR(20);
ALTER TABLE "public_pages" ADD COLUMN IF NOT EXISTS "subtitle_color" VARCHAR(20);
