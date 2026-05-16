import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const REAL_ACCOUNT_ID = 'f737b204-057b-4c25-a20f-595f0efa8c5f';
const TEMP_EMAIL = 'hash-source@comui.internal';

async function main() {
  const temp = await p.organizerAccount.findUnique({ where: { email: TEMP_EMAIL } });
  if (!temp?.passwordHash) { console.error('Temp account not found'); return; }
  console.log('Temp hash prefix:', temp.passwordHash.slice(0, 20));

  await p.organizerAccount.update({
    where: { id: REAL_ACCOUNT_ID },
    data: { passwordHash: temp.passwordHash },
  });
  console.log('Hash copied to real account');

  await p.organizerAccount.delete({ where: { email: TEMP_EMAIL } });
  await p.tenant.delete({ where: { id: temp.tenantId } });
  console.log('Temp account deleted');
}

main().catch(console.error).finally(() => p.$disconnect());
