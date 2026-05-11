import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.env.TENANT_ID ?? 'tenant-001';

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: '交流会サンプル団体',
      description: 'テスト用の交流会団体です。',
      plan: 'free',
    },
  });

  console.log(`✅ Tenant seeded: ${tenantId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
