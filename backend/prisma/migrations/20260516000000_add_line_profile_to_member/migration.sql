ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "line_display_name" VARCHAR(200);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "line_picture_url" VARCHAR(500);
