import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oldId = process.argv[2];
  const newId = process.argv[3] ?? 'tenant-001';

  if (!oldId) {
    console.error('Usage: ts-node prisma/rename-tenant.ts <old-id> [new-id]');
    process.exit(1);
  }

  console.log(`Renaming tenant ${oldId} → ${newId}`);

  await prisma.$transaction(async (tx) => {
    // 外部キー制約を一時的に遅延評価に変更
    await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;

    // テナントID変更
    await tx.$executeRaw`UPDATE tenants SET id = ${newId} WHERE id = ${oldId}`;

    // 子テーブルを一括更新
    await tx.$executeRaw`UPDATE events SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE members SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE organizer_accounts SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE notifications SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE connections SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE admin_member_messages SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE support_messages SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE event_reviews SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
    await tx.$executeRaw`UPDATE reservations SET tenant_id = ${newId} WHERE tenant_id = ${oldId}`;
  });

  console.log('Done ✓');
}

main().catch(console.error).finally(() => prisma.$disconnect());
