import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.env.TENANT_ID ?? 'tenant-001';

  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: '交流会サンプル団体',
      description: 'テスト用の交流会団体です。',
      plan: 'standard',
    },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  // Organizer account (email: admin@example.com / password: password)
  const passwordHash = await bcrypt.hash('password', 10);
  await prisma.organizerAccount.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      tenantId,
      email: 'admin@example.com',
      passwordHash,
    },
  });
  console.log('✅ OrganizerAccount: admin@example.com');

  // Events
  const now = new Date();
  const events = await Promise.all([
    prisma.event.upsert({
      where: { id: 'event-001' },
      update: {},
      create: {
        id: 'event-001',
        tenantId,
        title: '第1回 春の交流会',
        description: '新年度最初の交流イベントです。気軽にご参加ください！',
        heldAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        location: '渋谷区文化センター 大ホール',
        capacity: 30,
        status: 'open',
        price: 1000,
        paymentRequired: false,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-002' },
      update: {},
      create: {
        id: 'event-002',
        tenantId,
        title: 'ビジネス交流ランチ会',
        description: 'ランチを楽しみながらビジネスの話をしましょう。',
        heldAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        location: '新宿区 カフェルーム',
        capacity: 20,
        status: 'open',
        price: 2000,
        paymentRequired: false,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-003' },
      update: {},
      create: {
        id: 'event-003',
        tenantId,
        title: '夜の懇親会（ドラフト）',
        description: '企画中のイベントです。',
        heldAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        location: '未定',
        capacity: 50,
        status: 'draft',
        price: 3000,
        paymentRequired: false,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-004' },
      update: {},
      create: {
        id: 'event-004',
        tenantId,
        title: '昨年度 忘年会',
        description: '昨年度の忘年会です（終了済み）。',
        heldAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        location: '池袋 居酒屋えん',
        capacity: 40,
        status: 'closed',
        price: 4000,
        paymentRequired: false,
      },
    }),
  ]);
  console.log(`✅ Events: ${events.length}件`);

  // Members
  const members = await Promise.all([
    prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId: 'Uaaaaa00001' } },
      update: {},
      create: {
        id: 'member-001',
        tenantId,
        lineUserId: 'Uaaaaa00001',
        name: '田中 太郎',
        grade: '社会人',
        gender: 'male',
      },
    }),
    prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId: 'Uaaaaa00002' } },
      update: {},
      create: {
        id: 'member-002',
        tenantId,
        lineUserId: 'Uaaaaa00002',
        name: '佐藤 花子',
        grade: '大学生',
        gender: 'female',
      },
    }),
    prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId: 'Uaaaaa00003' } },
      update: {},
      create: {
        id: 'member-003',
        tenantId,
        lineUserId: 'Uaaaaa00003',
        name: '鈴木 一郎',
        grade: '社会人',
        gender: 'male',
      },
    }),
    prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId: 'Uaaaaa00004' } },
      update: {},
      create: {
        id: 'member-004',
        tenantId,
        lineUserId: 'Uaaaaa00004',
        name: '山田 さくら',
        grade: '大学院生',
        gender: 'female',
      },
    }),
    prisma.member.upsert({
      where: { tenantId_lineUserId: { tenantId, lineUserId: 'Uaaaaa00005' } },
      update: {},
      create: {
        id: 'member-005',
        tenantId,
        lineUserId: 'Uaaaaa00005',
        name: '高橋 健太',
        grade: '社会人',
        gender: 'male',
      },
    }),
  ]);
  console.log(`✅ Members: ${members.length}人`);

  // Reservations
  const reservations = [
    { id: 'rsv-001', eventId: 'event-001', memberId: 'member-001', status: 'reserved' as const },
    { id: 'rsv-002', eventId: 'event-001', memberId: 'member-002', status: 'reserved' as const },
    { id: 'rsv-003', eventId: 'event-001', memberId: 'member-003', status: 'waitlisted' as const },
    { id: 'rsv-004', eventId: 'event-002', memberId: 'member-001', status: 'reserved' as const },
    { id: 'rsv-005', eventId: 'event-002', memberId: 'member-004', status: 'reserved' as const },
    { id: 'rsv-006', eventId: 'event-004', memberId: 'member-001', status: 'attended' as const },
    { id: 'rsv-007', eventId: 'event-004', memberId: 'member-002', status: 'attended' as const },
    { id: 'rsv-008', eventId: 'event-004', memberId: 'member-005', status: 'cancelled' as const },
  ];

  for (const rsv of reservations) {
    await prisma.reservation.upsert({
      where: { id: rsv.id },
      update: {},
      create: { ...rsv, tenantId },
    });
  }
  console.log(`✅ Reservations: ${reservations.length}件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
