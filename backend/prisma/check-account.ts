import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();
const email = process.argv[2] ?? 'ktgwgnt@gmail.com';
const password = process.argv[3];

async function main() {
  const account = await p.organizerAccount.findUnique({ where: { email } });
  if (!account) { console.log('Account NOT FOUND for email:', email); return; }
  console.log('Account found:', { id: account.id, email: account.email, hasHash: !!account.passwordHash });
  if (password && account.passwordHash) {
    const valid = await bcrypt.compare(password, account.passwordHash);
    console.log('Password valid:', valid);
  }
}

main().catch(console.error).finally(() => p.$disconnect());
