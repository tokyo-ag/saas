import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE tenants SET code = NULL
    WHERE id IN ('tenant-001', 'tenant-002', 'tenant-003', '600c37f8-ca3a-428f-8c8d-cdbd2968a00a')
  `);
  console.log(`取り消し完了: ${result}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
