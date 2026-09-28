-- One-time reconciliation for a reservation made on the pre-collaboration event.
-- The update runs only when the source reservation and destination are both unique.
WITH candidate_reservations AS (
  SELECT reservation."id"
  FROM "reservations" AS reservation
  JOIN "members" AS member
    ON member."id" = reservation."member_id"
  JOIN "events" AS source_event
    ON source_event."id" = reservation."event_id"
  WHERE reservation."tenant_id" = 'tenant-1779169630551'
    AND reservation."status" IN ('reserved', 'attended', 'waiting_payment')
    AND md5(COALESCE(member."line_display_name", '')) = '07f018d7f8375f56ba62639c060eb3e9'
    AND member."gender" = '女性'
    AND source_event."tenant_id" = reservation."tenant_id"
    AND source_event."id" <> 'be635827-cc2c-4190-84d2-a2b6b0fb7bfa'
    AND source_event."held_at" = TIMESTAMPTZ '2026-11-18 08:00:00+00'
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
valid_destination AS (
  SELECT destination."id", destination."tenant_id"
  FROM "events" AS destination
  WHERE destination."id" = 'be635827-cc2c-4190-84d2-a2b6b0fb7bfa'
    AND destination."tenant_id" = 'tenant-1779169630551'
    AND destination."held_at" = TIMESTAMPTZ '2026-11-18 08:00:00+00'
    AND destination."collab_read_only" = true
    AND EXISTS (
      SELECT 1
      FROM "collab_event_links" AS destination_link
      WHERE destination_link."event_id" = destination."id"
    )
)
UPDATE "reservations" AS reservation
SET
  "event_id" = destination."id",
  "tenant_id" = destination."tenant_id"
FROM single_candidate
CROSS JOIN valid_destination AS destination
WHERE reservation."id" = single_candidate."id";
