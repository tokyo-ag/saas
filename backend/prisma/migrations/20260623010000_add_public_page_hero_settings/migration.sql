ALTER TABLE "public_pages"
  ADD COLUMN IF NOT EXISTS "image_captions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "hero_image_mode" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "hero_overlay_opacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "hero_overlay_color" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "button_layout" VARCHAR(20);
