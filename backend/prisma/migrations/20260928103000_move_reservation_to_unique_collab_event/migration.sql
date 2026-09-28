-- Resolve the destination from the collaboration link instead of a public event id.
WITH destination_candidates AS (
  SELECT destination."id", destination."tenant_id"
  FROM "events" AS destination
  JOIN "collab_event_links" AS destination_link
    ON destination_link."event_id" = destination."id"
  WHERE destination."tenant_id" = 'tenant-1779169630551'
    AND destination."held_at" = TIMESTAMPTZ '2026-11-18 08:00:00+00'
),
single_destination AS (
  SELECT MIN("id") AS "id", MIN("tenant_id") AS "tenant_id"
  FROM destination_candidates
  HAVING COUNT(*) = 1
)
UPDATE "events" AS destination
SET "collab_read_only" = true
FROM single_destination
WHERE destination."id" = single_destination."id";

WITH candidate_reservations AS (
  SELECT reservation."id"
  FROM "reservations" AS reservation
  JOIN "members" AS member
    ON member."id" = reservation."member_id"
  JOIN "events" AS source_event
    ON source_event."id" = reservation."event_id"
  WHERE reservation."tenant_id" = 'tenant-1779169630551'
    AND reservation."status" IN ('reserved', 'attended', 'waiting_payment')
    AND reservation."reserved_at" >= TIMESTAMPTZ '2026-09-19 13:38:00+00'
    AND reservation."reserved_at" < TIMESTAMPTZ '2026-09-19 13:39:00+00'
    AND (
      md5(TRIM(COALESCE(member."line_display_name", ''))) = '07f018d7f8375f56ba62639c060eb3e9'
      OR md5(TRIM(COALESCE(member."name", ''))) = '8b65b11aaa30fb35023a46c77189b1e5'
    )
    AND source_event."tenant_id" = reservation."tenant_id"
    AND NOT EXISTS (
      SELECT 1
      FROM "collab_event_links" AS source_link
      WHERE source_link."event_id" = source_event."id"
    )
),
single_candidate AS (
  SELECT MIN("id") AS "id"
  FROM candidate_reservations
  HAVING COUNT(*) = 1
),
destination_candidates AS (
  SELECT destination."id", destination."tenant_id"
  FROM "events" AS destination
  JOIN "collab_event_links" AS destination_link
    ON destination_link."event_id" = destination."id"
  WHERE destination."tenant_id" = 'tenant-1779169630551'
    AND destination."held_at" = TIMESTAMPTZ '2026-11-18 08:00:00+00'
    AND destination."collab_read_only" = true
),
single_destination AS (
  SELECT MIN("id") AS "id", MIN("tenant_id") AS "tenant_id"
  FROM destination_candidates
  HAVING COUNT(*) = 1
)
UPDATE "reservations" AS reservation
SET
  "event_id" = single_destination."id",
  "tenant_id" = single_destination."tenant_id"
FROM single_candidate
CROSS JOIN single_destination
WHERE reservation."id" = single_candidate."id";
