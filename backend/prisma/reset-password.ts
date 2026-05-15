import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();
const ACCOUNT_ID = 'f737b204-057b-4c25-a20f-595f0efa8c5f';
const NEW_PASSWORD = process.argv[2];

async function main() {
  if (!NEW_PASSWORD) {
    console.error('Usage: ts-node prisma/reset-password.ts <newpassword>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  await p.organizerAccount.update({
    where: { id: ACCOUNT_ID },
    data: { passwordHash: hash },
  });
  const verify = await bcrypt.compare(NEW_PASSWORD, hash);
  console.log('Hash updated. Verification:', verify);
  console.log('Hash prefix:', hash.slice(0, 20));
}

main().catch(console.error).finally(() => p.$disconnect());
