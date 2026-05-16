import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const t = await p.tenant.findUnique({ where: { id: 'tenant-001' }, select: { id: true, liffEventView: true } });
console.log(JSON.stringify(t));
await p.$disconnect();
