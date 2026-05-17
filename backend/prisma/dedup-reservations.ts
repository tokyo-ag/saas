import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ACTIVE = ['reserved', 'attended', 'waiting_payment', 'waitlisted'] as const;

  // 同一メンバー＆同一イベントで複数のアクティブ予約を持つケースを取得
  const grouped = await prisma.reservation.groupBy({
    by: ['memberId', 'eventId'],
    where: { status: { in: [...ACTIVE] } },
    having: { memberId: { _count: { gt: 1 } } },
    _count: { memberId: true },
  });

  if (grouped.length === 0) {
    console.log('重複予約はありません。');
    return;
  }

  console.log(`重複グループ: ${grouped.length}件`);
  let cancelled = 0;

  for (const g of grouped) {
    const reservations = await prisma.reservation.findMany({
      where: { memberId: g.memberId, eventId: g.eventId, status: { in: [...ACTIVE] } },
      orderBy: { reservedAt: 'asc' },
    });

    // 最も古い1件を残してキャンセル
    const [keep, ...duplicates] = reservations;
    console.log(`  member=${g.memberId} event=${g.eventId}: 残す=${keep.id} キャンセル=${duplicates.map(r => r.id).join(', ')}`);

    await prisma.reservation.updateMany({
      where: { id: { in: duplicates.map(r => r.id) } },
      data: { status: 'cancelled' },
    });

    cancelled += duplicates.length;
  }

  console.log(`完了: ${cancelled}件をキャンセルに更新しました。`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
