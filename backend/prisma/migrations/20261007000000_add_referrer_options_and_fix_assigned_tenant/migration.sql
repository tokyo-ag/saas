-- Add referrer_options to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "referrer_options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Fix assigned_tenant_id type: remove UUID constraint (tenants.id is TEXT)
ALTER TABLE "collab_duplicate_overrides" ALTER COLUMN "assigned_tenant_id" TYPE TEXT;
