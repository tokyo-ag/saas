import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.organizerAccount.findMany()
  .then(r => r.forEach(a => console.log({ id: a.id, email: a.email, hasHash: !!a.passwordHash, lineUserId: a.lineUserId })))
  .finally(() => p.$disconnect());
