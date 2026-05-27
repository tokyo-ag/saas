import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targets = await prisma.event.findMany({
    where: { title: { contains: 'コピー' } },
    select: { id: true, title: true, tenantId: true },
  });

  if (targets.length === 0) {
    console.log('削除対象のイベントはありません。');
    return;
  }

  console.log(`削除対象: ${targets.length}件`);
  targets.forEach((e) => console.log(`  [${e.id.slice(0, 8)}] ${e.title}`));

  const ids = targets.map((e) => e.id);

  // 関連データを順番に削除
  const reservations = await prisma.reservation.deleteMany({ where: { eventId: { in: ids } } });
  const likes = await prisma.eventLike.deleteMany({ where: { eventId: { in: ids } } });
  const reviews = await prisma.eventReview.deleteMany({ where: { eventId: { in: ids } } });
  const events = await prisma.event.deleteMany({ where: { id: { in: ids } } });

  console.log(`\n完了:`);
  console.log(`  イベント削除: ${events.count}件`);
  console.log(`  予約削除: ${reservations.count}件`);
  console.log(`  いいね削除: ${likes.count}件`);
  console.log(`  感想削除: ${reviews.count}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
