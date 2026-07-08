UPDATE "tenants"
SET "activity_tags" = COALESCE(
  ARRAY(
    SELECT tag
    FROM unnest("activity_tags") AS tag
    WHERE tag IN ('交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー')
  ),
  ARRAY[]::TEXT[]
);

UPDATE "tenants"
SET "tags" = COALESCE(
  ARRAY(
    SELECT tag
    FROM unnest("tags") AS tag
    WHERE tag IN ('交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー')
  ),
  ARRAY[]::TEXT[]
);
