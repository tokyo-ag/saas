DROP TABLE IF EXISTS "line_notification_link_codes";

DROP INDEX IF EXISTS "members_tenant_id_messaging_line_user_id_key";

ALTER TABLE "members"
DROP COLUMN IF EXISTS "messaging_line_user_id";
