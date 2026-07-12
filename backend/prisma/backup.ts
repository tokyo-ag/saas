import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const [tenants, members, events, reservations, notifications] = await Promise.all([
    prisma.tenant.findMany(),
    prisma.member.findMany(),
    prisma.event.findMany(),
    prisma.reservation.findMany(),
    prisma.notification.findMany(),
  ]);

  const data = { tenants, members, events, reservations, notifications };

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const file = path.join(__dirname, `../../backup_${date}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`バックアップ完了: ${file}`);
  console.log(`  テナント: ${tenants.length}件`);
  console.log(`  メンバー: ${members.length}件`);
  console.log(`  イベント: ${events.length}件`);
  console.log(`  予約: ${reservations.length}件`);
  console.log(`  通知: ${notifications.length}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
