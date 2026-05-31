CREATE TABLE "error_logs" (
  "id" TEXT NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "url" VARCHAR(500) NOT NULL,
  "status" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "error_logs_created_at_idx" ON "error_logs"("created_at");
