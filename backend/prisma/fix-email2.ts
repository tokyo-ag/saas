import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.organizerAccount.update({
  where: { id: 'f737b204-057b-4c25-a20f-595f0efa8c5f' },
  data: { email: 'ktgwgnt@gmail.com' },
}).then(r => console.log('OK', r.email)).finally(() => p.$disconnect());
