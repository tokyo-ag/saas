-- A profile is editable, but the participant identity is fixed by members.id
-- (which is uniquely tied to tenant_id + line_user_id). Keep at most one active
-- reservation for that identity and event before enforcing the invariant.
WITH ranked_active_reservations AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "event_id", "member_id"
      ORDER BY
        CASE "status"
          WHEN 'attended' THEN 0
          WHEN 'reserved' THEN 1
          WHEN 'waiting_payment' THEN 2
          WHEN 'waitlisted' THEN 3
          ELSE 4
        END,
        CASE WHEN "paid_at" IS NOT NULL THEN 0 ELSE 1 END,
        "reserved_at" ASC,
        "id" ASC
    ) AS row_number
  FROM "reservations"
  WHERE "status" <> 'cancelled'
)
UPDATE "reservations"
SET
  "status" = 'cancelled',
  "waitlist_order" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_reservations
  WHERE row_number > 1
);

-- Cancelled history remains available and the same participant can reserve
-- again after cancellation, while concurrent active reservations are rejected.
CREATE UNIQUE INDEX "reservations_event_id_member_id_active_key"
ON "reservations"("event_id", "member_id")
WHERE "status" <> 'cancelled';
