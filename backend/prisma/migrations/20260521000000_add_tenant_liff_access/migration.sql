CREATE TABLE "tenant_liff_accesses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_liff_accesses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenant_liff_accesses_tenant_id_accessed_at_idx" ON "tenant_liff_accesses"("tenant_id", "accessed_at");

ALTER TABLE "tenant_liff_accesses" ADD CONSTRAINT "tenant_liff_accesses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
