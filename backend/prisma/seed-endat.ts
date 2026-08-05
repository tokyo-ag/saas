import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'tenant-001';

  // Delete existing open events for tenant-001 to avoid clutter
  const existing = await prisma.event.findMany({ where: { tenantId, status: 'open' }, select: { id: true } });
  const ids = existing.map((e) => e.id);
  if (ids.length > 0) {
    await prisma.reservation.deleteMany({ where: { eventId: { in: ids } } });
    await prisma.event.deleteMany({ where: { id: { in: ids } } });
  }

  const base = new Date('2026-05-01T00:00:00Z');

  const events = [
    {
      title: '5月バレーボール練習会（初心者歓迎）',
      heldAt: new Date('2026-05-17T09:00:00+09:00'),
      endAt: new Date('2026-05-17T12:00:00+09:00'),
      location: '豊島区スポーツセンター 第1体育室',
      price: 500,
    },
    {
      title: '池袋バスケ定期練習 #28',
      heldAt: new Date('2026-05-18T14:00:00+09:00'),
      endAt: new Date('2026-05-18T17:00:00+09:00'),
      location: '板橋区立高島平体育館',
      price: 800,
    },
    {
      title: 'フットサル交流戦（20代限定）',
      heldAt: new Date('2026-05-20T18:00:00+09:00'),
      endAt: new Date('2026-05-20T21:00:00+09:00'),
      location: '練馬区立光が丘体育館',
      price: 1000,
    },
    {
      title: 'バドミントン体験会（入会説明あり）',
      heldAt: new Date('2026-05-24T10:00:00+09:00'),
      endAt: new Date('2026-05-24T13:00:00+09:00'),
      location: '北区立滝野川体育館',
      price: 0,
    },
    {
      title: '6月バレーボール練習会',
      heldAt: new Date('2026-06-07T09:00:00+09:00'),
      endAt: new Date('2026-06-07T12:00:00+09:00'),
      location: '豊島区スポーツセンター 第2体育室',
      price: 500,
    },
    {
      title: '池袋バスケ定期練習 #29',
      heldAt: new Date('2026-06-14T14:00:00+09:00'),
      endAt: new Date('2026-06-14T17:00:00+09:00'),
      location: '文京区スポーツセンター',
      price: 800,
    },
    {
      title: 'フットサル夏季大会（予選）',
      heldAt: new Date('2026-06-21T13:00:00+09:00'),
      endAt: new Date('2026-06-21T18:00:00+09:00'),
      location: '練馬区立光が丘公園フットサルコート',
      price: 1500,
    },
  ];

  for (const ev of events) {
    await prisma.event.create({
      data: {
        tenantId,
        title: ev.title,
        heldAt: ev.heldAt,
        endAt: ev.endAt,
        location: ev.location,
        price: ev.price,
        status: 'open',
        capacity: 20,
        paymentRequired: false,
        paymentTiming: 'onsite',
      },
    });
    console.log(`Created: ${ev.title}`);
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
