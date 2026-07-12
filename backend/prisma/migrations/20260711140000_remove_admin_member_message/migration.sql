-- DropForeignKey
ALTER TABLE "admin_member_messages" DROP CONSTRAINT "admin_member_messages_member_id_fkey";

-- DropTable
DROP TABLE "admin_member_messages";
