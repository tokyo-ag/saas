/*
  Warnings:

  - You are about to drop the column `email` on the `organizer_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `organizer_accounts` table. All the data in the column will be lost.
  - Made the column `line_user_id` on table `organizer_accounts` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "organizer_accounts_email_key";

-- AlterTable
ALTER TABLE "organizer_accounts" DROP COLUMN "email",
DROP COLUMN "password_hash",
ALTER COLUMN "line_user_id" SET NOT NULL;
