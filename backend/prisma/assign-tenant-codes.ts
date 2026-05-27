import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_IDS = [
  'tenant-1779403327733', // イベントコミュニティf→one (fiftyone)
  'tenant-1779169958825', // GAKUORI
  'tenant-1779169630551', // YURUBADO
  'tenant-001',           // インカレサークルBELL
];

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    const existing = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM tenants WHERE code = ${code} LIMIT 1`;
    if (existing.length === 0) return code;
  }
  throw new Error('コード生成失敗');
}

async function main() {
  const tenants = await prisma.$queryRaw<{ id: string; name: string; code: string | null }[]>`
    SELECT id, name, code FROM tenants WHERE id = ANY(${TARGET_IDS})
  `;

  for (const t of tenants) {
    if (t.code) {
      console.log(`${t.name} → 既存コード: ${t.code}`);
    } else {
      const code = await generateUniqueCode();
      await prisma.$executeRaw`UPDATE tenants SET code = ${code} WHERE id = ${t.id}`;
      console.log(`${t.name} → 新規割り当て: ${code}`);
    }
  }
  console.log('完了');
}

main().catch(console.error).finally(() => prisma.$disconnect());
