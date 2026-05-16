ALTER TABLE "admin_member_messages" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "push_subscriptions" ADD COLUMN "member_id" VARCHAR(36);
CREATE INDEX "push_subscriptions_member_id_idx" ON "push_subscriptions"("member_id");
