-- CreateTable
CREATE TABLE "collab_groups" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(100),
    "view_token" VARCHAR(64) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_event_links" (
    "id" TEXT NOT NULL,
    "collab_group_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collab_event_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collab_duplicate_overrides" (
    "id" TEXT NOT NULL,
    "collab_group_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "is_duplicate" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collab_duplicate_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collab_groups_view_token_key" ON "collab_groups"("view_token");

-- CreateIndex
CREATE UNIQUE INDEX "collab_event_links_event_id_key" ON "collab_event_links"("event_id");

-- CreateIndex
CREATE INDEX "collab_event_links_collab_group_id_idx" ON "collab_event_links"("collab_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "collab_duplicate_overrides_reservation_id_key" ON "collab_duplicate_overrides"("reservation_id");

-- CreateIndex
CREATE INDEX "collab_duplicate_overrides_collab_group_id_idx" ON "collab_duplicate_overrides"("collab_group_id");

-- AddForeignKey
ALTER TABLE "collab_event_links" ADD CONSTRAINT "collab_event_links_collab_group_id_fkey" FOREIGN KEY ("collab_group_id") REFERENCES "collab_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_event_links" ADD CONSTRAINT "collab_event_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_duplicate_overrides" ADD CONSTRAINT "collab_duplicate_overrides_collab_group_id_fkey" FOREIGN KEY ("collab_group_id") REFERENCES "collab_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collab_duplicate_overrides" ADD CONSTRAINT "collab_duplicate_overrides_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
