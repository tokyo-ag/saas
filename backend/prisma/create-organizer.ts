import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!tenantId || !email || !password) {
    console.error('Usage: ts-node create-organizer.ts <tenantId> <email> <password>');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.organizerAccount.create({
    data: { tenantId, email, passwordHash },
  });
  console.log('Organizer created:', account);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
