ALTER TABLE "tenants" ADD COLUMN "type_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tenants" ADD COLUMN "activity_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "tenants"
SET "activity_tags" = "tags"
WHERE COALESCE(array_length("activity_tags", 1), 0) = 0
  AND COALESCE(array_length("tags", 1), 0) > 0;
