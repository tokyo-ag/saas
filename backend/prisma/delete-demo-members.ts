import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targets = await prisma.member.findMany({
    where: { lineUserId: { startsWith: 'demo-' } },
    select: { id: true, lineUserId: true, lineDisplayName: true, name: true },
  });

  if (targets.length === 0) {
    console.log('削除対象はありません。');
    return;
  }

  console.log(`削除対象: ${targets.length}件`);
  targets.forEach((m) => console.log(`  [${m.id.slice(0, 8)}] ${m.lineDisplayName ?? m.name ?? '未入力'} (${m.lineUserId})`));

  const ids = targets.map((m) => m.id);

  // 関連データを順番に削除
  const reservations = await prisma.reservation.deleteMany({ where: { memberId: { in: ids } } });
  const messages = await prisma.adminMemberMessage.deleteMany({ where: { memberId: { in: ids } } });
  const notifications = await prisma.notification.deleteMany({ where: { memberId: { in: ids } } });
  const reviews = await prisma.eventReview.deleteMany({ where: { memberId: { in: ids } } });
  const members = await prisma.member.deleteMany({ where: { id: { in: ids } } });

  console.log(`\n完了:`);
  console.log(`  メンバー削除: ${members.count}件`);
  console.log(`  予約削除: ${reservations.count}件`);
  console.log(`  メッセージ削除: ${messages.count}件`);
  console.log(`  通知削除: ${notifications.count}件`);
  console.log(`  感想削除: ${reviews.count}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
