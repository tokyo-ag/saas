CREATE TABLE "tenant_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_reviews_tenant_id_member_id_key" ON "tenant_reviews"("tenant_id", "member_id");

ALTER TABLE "tenant_reviews" ADD CONSTRAINT "tenant_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_reviews" ADD CONSTRAINT "tenant_reviews_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
