ALTER TABLE "public_pages"
ADD COLUMN IF NOT EXISTS "contact_label" VARCHAR(40);

UPDATE "public_pages"
SET "contact_label" = 'お問い合わせ'
WHERE "contact_label" IS NULL;
