-- 口コミは投稿時に自動公開される仕様に変更。既に投稿済みで承認待ちのまま
-- 埋もれていた口コミも、このタイミングで一度だけ公開状態にする。
UPDATE "tenant_reviews" SET "is_published" = true WHERE "is_published" = false;

ALTER TABLE "tenant_reviews" ALTER COLUMN "is_published" SET DEFAULT true;
