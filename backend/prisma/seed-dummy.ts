import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function seedTenant001() {
  const tenantId = 'tenant-001';

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: '大学生交流サークル Connect',
      description: '大学生が集まる交流会。初参加大歓迎！',
      plan: 'standard',
    },
  });

  const [event1, event2, event3, event4] = await Promise.all([
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card1.svg',
        iconUrl: '/uploads/card1.svg',
        title: '春の交流会 2026',
        description: 'みんなで楽しく交流しましょう！\n初参加の方も大歓迎です。軽食・ドリンク付き。',
        heldAt: new Date('2026-06-15T14:00:00+09:00'),
        location: '渋谷カフェ・コモンズ（渋谷駅徒歩5分）',
        capacity: 20,
        status: 'open',
        price: 0,
        notifyOnReserve: true,
        remindEnabled: true,
        remindAt: new Date('2026-06-14T18:00:00+09:00'),
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card2.svg',
        iconUrl: '/uploads/card2.svg',
        title: '6月BBQ交流会',
        description: '屋外でBBQ！天気が良ければ最高の交流ができます。\n参加費には食材・飲み物代が含まれます。',
        heldAt: new Date('2026-06-28T11:00:00+09:00'),
        location: '代々木公園バーベキュー広場',
        capacity: 15,
        status: 'open',
        price: 1500,
        notifyOnReserve: true,
        remindEnabled: false,
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card3.svg',
        iconUrl: '/uploads/card3.svg',
        title: '4月キックオフ交流会',
        description: '新年度最初の交流会でした。ご参加ありがとうございました！',
        heldAt: new Date('2026-04-20T15:00:00+09:00'),
        location: '新宿コワーキングスペース',
        capacity: 25,
        status: 'closed',
        price: 0,
        notifyOnReserve: true,
        remindEnabled: false,
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card4.svg',
        iconUrl: '/uploads/card4.svg',
        title: '夏のナイト交流会（仮）',
        description: '夜の交流会を企画中です。詳細は後日公開予定。',
        heldAt: new Date('2026-07-25T19:00:00+09:00'),
        location: '未定',
        status: 'draft',
        price: 0,
        notifyOnReserve: true,
        remindEnabled: false,
      },
    }),
  ]);

  const [m0, m1, m2, m3, m4, m5, m6] = await Promise.all([
    prisma.member.create({ data: { tenantId, lineUserId: `demo-${tenantId}`, name: 'デモユーザー', grade: '大学3年', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'U001aaaa', name: '山田 太郎', grade: '大学3年', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'U002bbbb', name: '鈴木 花子', grade: '大学2年', gender: '女性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'U003cccc', name: '田中 健一', grade: '社会人', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'U004dddd', name: '佐藤 美咲', grade: '高校3年', gender: '女性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'U005eeee', name: '伊藤 拓海', grade: '大学院生', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'U006ffff', name: '渡辺 さくら', grade: '大学1年', gender: 'その他・回答しない' } }),
  ]);

  await Promise.all([
    prisma.reservation.create({ data: { tenantId, eventId: event1.id, memberId: m0.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event1.id, memberId: m1.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event1.id, memberId: m2.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event1.id, memberId: m3.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event1.id, memberId: m4.id, status: 'waitlisted', waitlistOrder: 1 } }),
    prisma.reservation.create({ data: { tenantId, eventId: event2.id, memberId: m1.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event2.id, memberId: m3.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event2.id, memberId: m6.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event3.id, memberId: m1.id, status: 'attended' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event3.id, memberId: m2.id, status: 'attended' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event3.id, memberId: m3.id, status: 'attended' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event3.id, memberId: m4.id, status: 'attended' } }),
    prisma.reservation.create({ data: { tenantId, eventId: event3.id, memberId: m6.id, status: 'attended' } }),
  ]);

  const [a1, b1] = sortedPair(m0.id, m1.id);
  const conn1 = await prisma.connection.create({ data: { tenantId, member1Id: a1, member2Id: b1 } });
  const [a2, b2] = sortedPair(m0.id, m2.id);
  const conn2 = await prisma.connection.create({ data: { tenantId, member1Id: a2, member2Id: b2 } });

  for (const msg of [
    { connectionId: conn1.id, senderId: m1.id, content: 'はじめまして！今日はよろしくお願いします😊' },
    { connectionId: conn1.id, senderId: m0.id, content: 'こちらこそ！楽しみましょう' },
    { connectionId: conn1.id, senderId: m1.id, content: '次のBBQ交流会も参加しますか？' },
    { connectionId: conn1.id, senderId: m0.id, content: '行く予定です！一緒に行きましょう' },
    { connectionId: conn1.id, senderId: m1.id, content: 'やったー！楽しみにしてます🎉' },
  ]) { await prisma.message.create({ data: msg }); }

  for (const msg of [
    { connectionId: conn2.id, senderId: m0.id, content: 'QRスキャンありがとうございました！' },
    { connectionId: conn2.id, senderId: m2.id, content: 'こちらこそ！またイベントで会いましょう' },
    { connectionId: conn2.id, senderId: m2.id, content: '次の交流会はいつですか？' },
  ]) { await prisma.message.create({ data: msg }); }

  console.log('✅ tenant-001: 大学生交流サークル Connect');
}

async function seedTenant002() {
  const tenantId = 'tenant-002';

  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: '社会人交流会 ビジネスネット東京',
      description: '東京の社会人が集まる本格的なビジネス交流会。名刺交換・人脈づくりに。',
      plan: 'standard',
    },
  });

  const [ev1, ev2, ev3] = await Promise.all([
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card5.svg',
        iconUrl: '/uploads/card5.svg',
        title: '第12回 ビジネス交流ナイト',
        description: '社会人限定の交流会。業種を超えた人脈を築きましょう。\n軽食・飲み物付き。名刺は多めにご持参ください。',
        heldAt: new Date('2026-06-20T19:00:00+09:00'),
        location: '丸の内ビジネスラウンジ（東京駅徒歩3分）',
        capacity: 30,
        status: 'open',
        price: 2000,
        notifyOnReserve: true,
        remindEnabled: true,
        remindAt: new Date('2026-06-19T18:00:00+09:00'),
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card6.svg',
        iconUrl: '/uploads/card6.svg',
        title: '起業家×会社員 マッチング交流会',
        description: '起業家と会社員が本音で語り合える場。新しいビジネスチャンスが生まれるかも！',
        heldAt: new Date('2026-07-05T14:00:00+09:00'),
        location: '渋谷インキュベーションスペース',
        capacity: 20,
        status: 'open',
        price: 1000,
        notifyOnReserve: true,
        remindEnabled: false,
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card6.svg',
        iconUrl: '/uploads/card6.svg',
        title: '第11回 ビジネス交流ナイト（終了）',
        description: '大盛況で終了しました。ご参加ありがとうございました！',
        heldAt: new Date('2026-05-10T19:00:00+09:00'),
        location: '丸の内ビジネスラウンジ',
        capacity: 30,
        status: 'closed',
        price: 2000,
        notifyOnReserve: true,
        remindEnabled: false,
      },
    }),
  ]);

  const [n1, n2, n3, n4, n5] = await Promise.all([
    prisma.member.create({ data: { tenantId, lineUserId: `demo-${tenantId}`, name: 'デモユーザー', grade: '社会人', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'V001aaaa', name: '高橋 誠', grade: '社会人', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'V002bbbb', name: '中村 あかり', grade: '社会人', gender: '女性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'V003cccc', name: '小林 大輔', grade: '社会人', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'V004dddd', name: '加藤 れな', grade: '社会人', gender: '女性' } }),
  ]);

  await Promise.all([
    prisma.reservation.create({ data: { tenantId, eventId: ev1.id, memberId: n1.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev1.id, memberId: n2.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev1.id, memberId: n3.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev2.id, memberId: n1.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev2.id, memberId: n4.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev3.id, memberId: n1.id, status: 'attended' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev3.id, memberId: n2.id, status: 'attended' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev3.id, memberId: n5.id, status: 'attended' } }),
  ]);

  console.log('✅ tenant-002: 社会人交流会 ビジネスネット東京');
}

async function seedTenant003() {
  const tenantId = 'tenant-003';

  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: '趣味人倶楽部 アウトドア部',
      description: 'ハイキング・キャンプ・登山好きが集まるコミュニティ。自然の中で仲間を作ろう！',
      plan: 'free',
    },
  });

  const [ev1, ev2] = await Promise.all([
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card7.svg',
        iconUrl: '/uploads/card7.svg',
        title: '高尾山ハイキング＆交流会',
        description: '初心者歓迎！高尾山をみんなで登って、山頂でお弁当交流。\n体力に自信がない方も安心のコースです。',
        heldAt: new Date('2026-06-22T08:00:00+09:00'),
        location: '高尾山口駅 改札前集合',
        capacity: 12,
        status: 'open',
        price: 500,
        notifyOnReserve: true,
        remindEnabled: true,
        remindAt: new Date('2026-06-21T20:00:00+09:00'),
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        imageUrl: '/uploads/card8.svg',
        iconUrl: '/uploads/card8.svg',
        title: '奥多摩キャンプ交流会',
        description: '1泊2日のキャンプ！焚き火を囲んで語り合おう。\n装備がない方は相談してください。',
        heldAt: new Date('2026-07-12T10:00:00+09:00'),
        location: '奥多摩・氷川キャンプ場',
        capacity: 8,
        status: 'open',
        price: 3000,
        notifyOnReserve: true,
        remindEnabled: false,
      },
    }),
  ]);

  const [p1, p2, p3, p4] = await Promise.all([
    prisma.member.create({ data: { tenantId, lineUserId: `demo-${tenantId}`, name: 'デモユーザー', grade: '社会人', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'W001aaaa', name: '松本 健太', grade: '社会人', gender: '男性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'W002bbbb', name: '井上 みお', grade: '大学4年', gender: '女性' } }),
    prisma.member.create({ data: { tenantId, lineUserId: 'W003cccc', name: '木村 拓', grade: '社会人', gender: '男性' } }),
  ]);

  await Promise.all([
    prisma.reservation.create({ data: { tenantId, eventId: ev1.id, memberId: p1.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev1.id, memberId: p2.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev1.id, memberId: p3.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev2.id, memberId: p1.id, status: 'reserved' } }),
    prisma.reservation.create({ data: { tenantId, eventId: ev2.id, memberId: p4.id, status: 'reserved' } }),
  ]);

  console.log('✅ tenant-003: 趣味人倶楽部 アウトドア部');
}

async function main() {
  await seedTenant001();
  await seedTenant002();
  await seedTenant003();
  console.log('\n🎉 全団体のダミーデータ投入完了');
  console.log('  /liff/tenant-001  大学生交流サークル Connect');
  console.log('  /liff/tenant-002  社会人交流会 ビジネスネット東京');
  console.log('  /liff/tenant-003  趣味人倶楽部 アウトドア部');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
