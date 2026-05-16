import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();
const password = process.argv[2];
if (!password) { console.error('Usage: ts-node fix-password.ts <newPassword>'); process.exit(1); }

bcrypt.hash(password, 10).then(passwordHash =>
  p.organizerAccount.update({
    where: { id: 'f737b204-057b-4c25-a20f-595f0efa8c5f' },
    data: { passwordHash },
  })
).then(r => console.log('Password updated for', r.email)).finally(() => p.$disconnect());
