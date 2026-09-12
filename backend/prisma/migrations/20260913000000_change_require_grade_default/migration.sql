-- 学年は必須にしない方が合うテナントも多いため、新規作成時のデフォルトをOFFに変更
ALTER TABLE "tenants" ALTER COLUMN "require_grade" SET DEFAULT false;
