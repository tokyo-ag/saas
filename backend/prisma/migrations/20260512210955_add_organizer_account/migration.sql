-- CreateTable
CREATE TABLE "organizer_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" VARCHAR(200),
    "password_hash" TEXT,
    "line_user_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_email_key" ON "organizer_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_line_user_id_key" ON "organizer_accounts"("line_user_id");

-- CreateIndex
CREATE INDEX "organizer_accounts_tenant_id_idx" ON "organizer_accounts"("tenant_id");

-- AddForeignKey
ALTER TABLE "organizer_accounts" ADD CONSTRAINT "organizer_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
