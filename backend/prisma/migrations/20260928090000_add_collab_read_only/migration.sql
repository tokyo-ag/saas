ALTER TABLE "events"
ADD COLUMN "collab_read_only" BOOLEAN NOT NULL DEFAULT false;

-- この項目追加前に承認され、すでに作成済みの受け手側イベントも閲覧専用にする。
UPDATE "events" AS target_event
SET "collab_read_only" = true
WHERE EXISTS (
  SELECT 1
  FROM "collab_event_links" AS target_link
  JOIN "collab_event_links" AS source_link
    ON source_link."collab_group_id" = target_link."collab_group_id"
   AND source_link."event_id" <> target_link."event_id"
  JOIN "events" AS source_event
    ON source_event."id" = source_link."event_id"
  JOIN "tenants" AS source_tenant
    ON source_tenant."id" = source_event."tenant_id"
  JOIN "support_messages" AS approval
    ON approval."tenant_id" = target_event."tenant_id"
   AND approval."line_user_id" = 'tenant:' || target_event."tenant_id"
   AND approval."from_user" = false
   AND approval."content" LIKE '【コラボ申請（承認済み）】%'
   AND approval."content" LIKE '%イベント名: ' || source_event."title" || '%'
   AND (
     approval."content" LIKE '%申請元団体ID: ' || source_event."tenant_id" || '%'
     OR (
       approval."content" NOT LIKE '%申請元団体ID:%'
       AND approval."content" LIKE '%申請元団体: ' || source_tenant."name" || '%'
     )
   )
  WHERE target_link."event_id" = target_event."id"
    AND source_event."tenant_id" <> target_event."tenant_id"
);
