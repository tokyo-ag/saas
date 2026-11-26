-- Add advance_price to events
ALTER TABLE "events" ADD COLUMN "advance_price" INTEGER;

-- Create payment_links table
CREATE TABLE "payment_links" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "amount" INTEGER NOT NULL,
  "stripe_payment_link_id" VARCHAR(100) NOT NULL,
  "url" VARCHAR(500) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_links_tenant_id_idx" ON "payment_links"("tenant_id");

ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
