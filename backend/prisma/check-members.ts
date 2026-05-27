import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      tenantId: true,
      lineUserId: true,
      lineDisplayName: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`総メンバー数: ${members.length}件\n`);

  // lineUserIdが重複しているケースを検出
  const byLineId: Record<string, typeof members> = {};
  for (const m of members) {
    const key = `${m.tenantId}:${m.lineUserId}`;
    (byLineId[key] ??= []).push(m);
  }

  const dupes = Object.entries(byLineId).filter(([, list]) => list.length > 1);
  if (dupes.length === 0) {
    console.log('重複メンバーはありません。');
  } else {
    console.log(`重複グループ: ${dupes.length}件`);
    for (const [key, list] of dupes) {
      console.log(`\n  ${key}`);
      list.forEach((m) => console.log(`    [${m.id.slice(0, 8)}] ${m.lineDisplayName ?? m.name ?? '未入力'} (${m.createdAt.toISOString()})`));
    }
  }

  console.log('\n--- 全メンバー一覧 ---');
  members.forEach((m) => console.log(`[${m.id.slice(0, 8)}] tenant=${m.tenantId.slice(0, 8)} lineId=${m.lineUserId} name=${m.lineDisplayName ?? m.name ?? '未入力'}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
