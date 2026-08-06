ALTER TABLE "members"
ADD COLUMN "messaging_line_user_id" VARCHAR(100);

CREATE UNIQUE INDEX "members_tenant_id_messaging_line_user_id_key"
ON "members"("tenant_id", "messaging_line_user_id");

CREATE TABLE "line_notification_link_codes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_notification_link_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "line_notification_link_codes_code_key"
ON "line_notification_link_codes"("code");

CREATE INDEX "line_notification_link_codes_tenant_id_member_id_idx"
ON "line_notification_link_codes"("tenant_id", "member_id");

ALTER TABLE "line_notification_link_codes"
ADD CONSTRAINT "line_notification_link_codes_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "line_notification_link_codes"
ADD CONSTRAINT "line_notification_link_codes_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
