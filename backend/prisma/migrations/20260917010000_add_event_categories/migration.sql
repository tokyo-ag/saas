-- AlterTable
ALTER TABLE "events" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing single-category events so the new multi-category filter works immediately.
UPDATE "events"
SET "categories" = ARRAY["category"]
WHERE "category" IS NOT NULL;
