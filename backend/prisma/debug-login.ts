import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  // Raw SQL で直接確認
  const rows = await p.$queryRaw<{ id: string; email: string; len: number; hash: string | null }[]>`
    SELECT id, email, octet_length(email) as len, password_hash as hash
    FROM organizer_accounts
    WHERE email IS NOT NULL
  `;
  console.log('Raw DB rows:', rows);

  for (const row of rows) {
    console.log(`\nemail bytes: [${Buffer.from(row.email).join(',')}]`);
    if (row.hash) {
      const valid = await bcrypt.compare('mead8132', row.hash);
      console.log(`bcrypt.compare('mead8132') for ${row.email}: ${valid}`);
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
