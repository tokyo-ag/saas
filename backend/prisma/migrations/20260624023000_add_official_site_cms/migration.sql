CREATE TABLE IF NOT EXISTS "official_site_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "status" VARCHAR(20) NOT NULL DEFAULT 'published',
  "hero_title" VARCHAR(160) NOT NULL DEFAULT 'サークル・イベント運営をLINEでかんたんに',
  "hero_lead" TEXT NOT NULL DEFAULT 'COMIUは、予約管理・参加者名簿・リマインド・問い合わせ対応をまとめて管理できる主催者向けWEBサービスです。',
  "primary_cta_label" VARCHAR(60) NOT NULL DEFAULT '無料ではじめる',
  "primary_cta_href" VARCHAR(500) NOT NULL DEFAULT '/register',
  "secondary_cta_label" VARCHAR(60) NOT NULL DEFAULT '相談する',
  "secondary_cta_href" VARCHAR(500) NOT NULL DEFAULT '/contact',
  "seo_title" VARCHAR(160),
  "seo_description" VARCHAR(300),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "official_site_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "official_site_settings" (
  "id",
  "status",
  "hero_title",
  "hero_lead",
  "primary_cta_label",
  "primary_cta_href",
  "secondary_cta_label",
  "secondary_cta_href"
)
VALUES (
  'default',
  'published',
  'サークル・イベント運営をLINEでかんたんに',
  'COMIUは、予約管理・参加者名簿・リマインド・問い合わせ対応をまとめて管理できる主催者向けWEBサービスです。',
  '無料ではじめる',
  '/register',
  '相談する',
  '/contact'
)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "official_articles" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "excerpt" VARCHAR(300),
  "body" TEXT NOT NULL,
  "category" VARCHAR(60),
  "target_keyword" VARCHAR(120),
  "cta_label" VARCHAR(80),
  "cta_href" VARCHAR(500),
  "og_image_url" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "official_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "official_articles_slug_key"
  ON "official_articles" ("slug");

CREATE INDEX IF NOT EXISTS "official_articles_status_published_at_idx"
  ON "official_articles" ("status", "published_at" DESC);

CREATE INDEX IF NOT EXISTS "official_articles_category_idx"
  ON "official_articles" ("category");
