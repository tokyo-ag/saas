ALTER TABLE "tenants" ADD COLUMN "code" VARCHAR(8);

UPDATE "tenants"
SET "code" = LPAD(CAST(FLOOR(RANDOM() * 90000000 + 10000000) AS BIGINT)::TEXT, 8, '0')
WHERE "code" IS NULL;

CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");
