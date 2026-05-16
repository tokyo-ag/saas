"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
const tenantId = process.env.TENANT_ID ?? 'tenant-001';
function daysFromNow(days, hour, minute = 0) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date;
}
function sortedPair(a, b) {
    return a < b ? [a, b] : [b, a];
}
async function clearTenantData() {
    const events = await prisma.event.findMany({
        where: { tenantId },
        select: { id: true },
    });
    const members = await prisma.member.findMany({
        where: { tenantId },
        select: { id: true },
    });
    const eventIds = events.map((event) => event.id);
    const memberIds = members.map((member) => member.id);
    await prisma.eventReview.deleteMany({ where: { tenantId } });
    await prisma.eventLike.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.adminMemberMessage.deleteMany({ where: { tenantId } });
    await prisma.notification.deleteMany({ where: { memberId: { in: memberIds } } });
    await prisma.message.deleteMany({
        where: {
            connection: { tenantId },
        },
    });
    await prisma.connection.deleteMany({ where: { tenantId } });
    await prisma.reservation.deleteMany({ where: { tenantId } });
    await prisma.member.deleteMany({ where: { tenantId } });
    await prisma.event.deleteMany({ where: { tenantId } });
    await prisma.organizerAccount.deleteMany({ where: { tenantId } });
}
async function main() {
    await clearTenantData();
    const tenant = await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {
            name: '東京20代スポーツサークル',
            description: '東京で20代中心にバドミントン、フットサル、バスケを楽しむ社会人・学生向けサークルです。',
            plan: 'standard',
        },
        create: {
            id: tenantId,
            name: '東京20代スポーツサークル',
            description: '東京で20代中心にバドミントン、フットサル、バスケを楽しむ社会人・学生向けサークルです。',
            plan: 'standard',
        },
    });
    const passwordHash = await bcrypt.hash('password', 10);
    await prisma.organizerAccount.create({
        data: {
            tenantId,
            email: 'admin@example.com',
            passwordHash,
        },
    });
    const events = await Promise.all([
        prisma.event.create({
            data: {
                id: 'event-badminton-open',
                tenantId,
                title: '東京20代バドミントン交流会',
                description: '初心者歓迎のバドミントン交流会です。ラリー中心でゆるく体を動かしながら、20代同士で自然に話せる雰囲気を大事にしています。',
                heldAt: daysFromNow(10, 19),
                location: '新宿区スポーツセンター',
                capacity: 24,
                status: 'open',
                price: 1000,
                paymentRequired: false,
                notifyOnReserve: true,
                notifyOnReserveApp: true,
                remindEnabled: true,
                remindAt: daysFromNow(9, 18),
            },
        }),
        prisma.event.create({
            data: {
                id: 'event-futsal-open',
                tenantId,
                title: '初心者歓迎フットサル会',
                description: '経験者だけで固まらない、20代中心のフットサル会です。運動不足解消や友達作りでの参加も歓迎です。',
                heldAt: daysFromNow(17, 20),
                location: '渋谷フットサルコート',
                capacity: 20,
                status: 'open',
                price: 1500,
                paymentRequired: false,
                notifyOnReserve: true,
                notifyOnReserveApp: true,
                remindEnabled: false,
            },
        }),
        prisma.event.create({
            data: {
                id: 'event-basketball-open',
                tenantId,
                title: '20代ミックスバスケ',
                description: 'ブランクありでも参加しやすいバスケ交流会です。軽いアップ、チーム分け、ゲームの流れで進めます。',
                heldAt: daysFromNow(24, 18, 30),
                location: '中野区立体育館',
                capacity: 18,
                status: 'open',
                price: 1200,
                paymentRequired: false,
                notifyOnReserve: true,
                notifyOnReserveApp: false,
                remindEnabled: false,
            },
        }),
        prisma.event.create({
            data: {
                id: 'event-badminton-past',
                tenantId,
                title: '初参加向けバドミントン会',
                description: '初参加の人が多かった過去開催イベントです。参加者の声をSEOページやイベント詳細で使う想定のダミーデータです。',
                heldAt: daysFromNow(-14, 19),
                location: '池袋体育館',
                capacity: 22,
                status: 'closed',
                price: 1000,
                paymentRequired: false,
                notifyOnReserve: true,
                notifyOnReserveApp: true,
                remindEnabled: false,
            },
        }),
        prisma.event.create({
            data: {
                id: 'event-draft',
                tenantId,
                title: '夏のスポーツ交流会',
                description: '公開前の下書きイベントです。',
                heldAt: daysFromNow(40, 19),
                location: '未定',
                capacity: 30,
                status: 'draft',
                price: 0,
                paymentRequired: false,
                notifyOnReserve: true,
                notifyOnReserveApp: false,
                remindEnabled: false,
            },
        }),
    ]);
    const members = await Promise.all([
        prisma.member.create({
            data: {
                id: 'member-demo',
                tenantId,
                lineUserId: `demo-${tenantId}`,
                name: 'デモユーザー',
                grade: '社会人',
                gender: '男性',
                showEventsToConnections: true,
            },
        }),
        prisma.member.create({
            data: {
                id: 'member-001',
                tenantId,
                lineUserId: 'Udummy001',
                name: '山田 太郎',
                grade: '社会人',
                gender: '男性',
                showEventsToConnections: true,
            },
        }),
        prisma.member.create({
            data: {
                id: 'member-002',
                tenantId,
                lineUserId: 'Udummy002',
                name: '佐藤 花子',
                grade: '大学4年',
                gender: '女性',
                showEventsToConnections: true,
            },
        }),
        prisma.member.create({
            data: {
                id: 'member-003',
                tenantId,
                lineUserId: 'Udummy003',
                name: '鈴木 一郎',
                grade: '社会人',
                gender: '男性',
                showEventsToConnections: true,
            },
        }),
        prisma.member.create({
            data: {
                id: 'member-004',
                tenantId,
                lineUserId: 'Udummy004',
                name: '田中 美咲',
                grade: '大学2年',
                gender: '女性',
                showEventsToConnections: false,
            },
        }),
        prisma.member.create({
            data: {
                id: 'member-005',
                tenantId,
                lineUserId: 'Udummy005',
                name: '高橋 健太',
                grade: '社会人',
                gender: '男性',
                showEventsToConnections: true,
            },
        }),
    ]);
    const [badminton, futsal, basketball, pastBadminton] = events;
    const [demo, yamada, sato, suzuki, tanaka, takahashi] = members;
    const reservations = [
        { id: 'rsv-001', eventId: badminton.id, memberId: demo.id, status: 'reserved' },
        { id: 'rsv-002', eventId: badminton.id, memberId: yamada.id, status: 'reserved' },
        { id: 'rsv-003', eventId: badminton.id, memberId: sato.id, status: 'reserved' },
        { id: 'rsv-004', eventId: badminton.id, memberId: suzuki.id, status: 'waitlisted', waitlistOrder: 1 },
        { id: 'rsv-005', eventId: futsal.id, memberId: yamada.id, status: 'reserved' },
        { id: 'rsv-006', eventId: futsal.id, memberId: tanaka.id, status: 'reserved' },
        { id: 'rsv-007', eventId: futsal.id, memberId: takahashi.id, status: 'reserved' },
        { id: 'rsv-008', eventId: basketball.id, memberId: demo.id, status: 'reserved' },
        { id: 'rsv-009', eventId: basketball.id, memberId: sato.id, status: 'reserved' },
        { id: 'rsv-010', eventId: pastBadminton.id, memberId: demo.id, status: 'attended' },
        { id: 'rsv-011', eventId: pastBadminton.id, memberId: yamada.id, status: 'attended' },
        { id: 'rsv-012', eventId: pastBadminton.id, memberId: sato.id, status: 'attended' },
        { id: 'rsv-013', eventId: pastBadminton.id, memberId: suzuki.id, status: 'attended' },
        { id: 'rsv-014', eventId: pastBadminton.id, memberId: tanaka.id, status: 'cancelled' },
    ];
    await prisma.reservation.createMany({
        data: reservations.map((reservation) => ({ ...reservation, tenantId })),
    });
    await prisma.eventReview.createMany({
        data: [
            {
                tenantId,
                eventId: pastBadminton.id,
                memberId: demo.id,
                content: '一人参加でしたが、20代が多くて話しやすかったです。初心者でもラリーから楽しめました。',
                isPublished: true,
            },
            {
                tenantId,
                eventId: pastBadminton.id,
                memberId: yamada.id,
                content: '社会人になってから運動する機会が減っていたので、ちょうどいい雰囲気でした。ガチすぎないのが良かったです。',
                isPublished: true,
            },
            {
                tenantId,
                eventId: pastBadminton.id,
                memberId: sato.id,
                content: '初参加でもペアを組みやすくて安心でした。女性も参加しやすい空気でした。',
                isPublished: true,
            },
            {
                tenantId,
                eventId: pastBadminton.id,
                memberId: suzuki.id,
                content: '久しぶりのバドミントンでしたが、ゆるく楽しめました。次回も参加したいです。',
                isPublished: false,
            },
        ],
    });
    await prisma.adminMemberMessage.createMany({
        data: [
            {
                tenantId,
                memberId: demo.id,
                content: '次回のバドミントン会はラケット貸出ありますか？',
                fromAdmin: false,
            },
            {
                tenantId,
                memberId: demo.id,
                content: 'はい、数本だけ貸出できます。必要でしたら当日受付で声をかけてください。',
                fromAdmin: true,
            },
            {
                tenantId,
                memberId: sato.id,
                content: '友達を1人誘っても大丈夫ですか？',
                fromAdmin: false,
            },
            {
                tenantId,
                memberId: sato.id,
                content: 'もちろん大丈夫です。イベントページから予約してもらえれば参加できます。',
                fromAdmin: true,
            },
        ],
    });
    const [a1, b1] = sortedPair(demo.id, yamada.id);
    const connection1 = await prisma.connection.create({
        data: { tenantId, member1Id: a1, member2Id: b1 },
    });
    const [a2, b2] = sortedPair(demo.id, sato.id);
    const connection2 = await prisma.connection.create({
        data: { tenantId, member1Id: a2, member2Id: b2 },
    });
    await prisma.message.createMany({
        data: [
            {
                connectionId: connection1.id,
                senderId: yamada.id,
                content: 'この前のバドミントン楽しかったです。次のフットサルも行きますか？',
            },
            {
                connectionId: connection1.id,
                senderId: demo.id,
                content: '行く予定です！初心者でも大丈夫そうなので一緒に行きましょう。',
            },
            {
                connectionId: connection2.id,
                senderId: sato.id,
                content: '友達紹介のリンクありがとう！次回も参加してみます。',
            },
            {
                connectionId: connection2.id,
                senderId: demo.id,
                content: 'ぜひぜひ。初参加でも浮かない雰囲気で良かったです。',
            },
        ],
    });
    await prisma.notification.createMany({
        data: [
            {
                tenantId,
                memberId: demo.id,
                title: '予約が完了しました',
                body: '東京20代バドミントン交流会の予約が完了しました。',
            },
            {
                tenantId,
                memberId: sato.id,
                title: '主催者から返信が届きました',
                body: '友達紹介について主催者から返信が届きました。',
            },
        ],
    });
    console.log(`Seeded tenant: ${tenant.name}`);
    console.log('Login: admin@example.com / password');
    console.log(`Events: ${events.length}`);
    console.log(`Members: ${members.length}`);
    console.log(`Reservations: ${reservations.length}`);
    console.log('Reviews: 4');
    console.log('Admin messages: 4');
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map