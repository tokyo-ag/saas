/**
 * One-time script: rename tenant-001 to a proper UUID.
 * Run: npx ts-node -e "require('./prisma/migrate-tenant-id')"
 * Or:  npx ts-node prisma/migrate-tenant-id.ts
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const OLD_ID = 'tenant-001';

async function main() {
  const old = await prisma.tenant.findUnique({ where: { id: OLD_ID } });
  if (!old) {
    console.log('tenant-001 が見つかりません。既に移行済みか存在しません。');
    return;
  }

  const newId = randomUUID();
  console.log(`移行開始: ${OLD_ID} → ${newId}`);

  // Step 1: 新IDで同じデータのテナントを作成（FK子テーブルが参照できる親を先に作る）
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = old;
  await prisma.tenant.create({ data: { id: newId, ...rest } });

  // Step 2: FK制約のある子テーブルを更新
  await prisma.$executeRaw`UPDATE organizer_accounts SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE events            SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE members           SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;

  // Step 3: FK制約のない参照テーブルを更新
  await prisma.$executeRaw`UPDATE notifications         SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE connections           SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE admin_member_messages SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE support_messages      SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE push_subscriptions    SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE event_reviews         SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;
  await prisma.$executeRaw`UPDATE reservations          SET tenant_id = ${newId} WHERE tenant_id = ${OLD_ID}`;

  // Step 4: 旧テナントを削除（子テーブルはすべて新IDを参照済み）
  await prisma.$executeRaw`DELETE FROM tenants WHERE id = ${OLD_ID}`;

  console.log(`✅ 完了！新しいテナントID: ${newId}`);
  console.log(`🔗 新しいLIFF URL: https://comiu.vercel.app/liff/${newId}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
