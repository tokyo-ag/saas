import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = process.argv[2] ?? 'comiu';
  const id = process.argv[3];

  const data: { name: string; id?: string } = { name };
  if (id) data.id = id;

  const tenant = await prisma.tenant.create({ data });
  console.log('Tenant created:', tenant);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
