ALTER TABLE "collab_duplicate_overrides"
ADD COLUMN "assigned_tenant_id" UUID;

CREATE INDEX "collab_duplicate_overrides_assigned_tenant_id_idx"
ON "collab_duplicate_overrides"("assigned_tenant_id");
