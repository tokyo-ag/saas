-- AlterTable
ALTER TABLE "tenants"
  DROP COLUMN "require_profile",
  ADD COLUMN "require_name" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "require_grade" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "require_gender" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_level" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_comment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "custom_profile_questions" JSONB;

-- AlterTable
ALTER TABLE "members" ADD COLUMN "custom_answers" JSONB;
