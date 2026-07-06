import { PrismaClient } from '@prisma/client';
import { toRomaji } from '../src/common/romaji';

const prisma = new PrismaClient();

function asciiSlug(value: string, maxLength = 80) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLength)
      .replace(/-+$/g, '') || ''
  );
}

async function slugBase(page: { title: string; slug: string; id: string }) {
  const source = page.title.trim() || page.slug;
  const romaji = source ? await toRomaji(source) : '';
  return asciiSlug(romaji) || `page-${page.id.slice(0, 8)}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const pages = await prisma.publicPage.findMany({
    orderBy: [{ tenantId: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      tenantId: true,
      title: true,
      slug: true,
      tenant: { select: { code: true, name: true } },
    },
  });

  const usedByTenant = new Map<string, Set<string>>();
  const changes: Array<{
    id: string;
    tenant: string;
    title: string;
    from: string;
    to: string;
  }> = [];

  for (const page of pages) {
    const used = usedByTenant.get(page.tenantId) ?? new Set<string>();
    usedByTenant.set(page.tenantId, used);

    let next = await slugBase(page);
    const base = next;
    let suffix = 1;
    while (used.has(next)) {
      const suffixText = `-${suffix++}`;
      next = `${base.slice(0, 80 - suffixText.length).replace(/-+$/g, '')}${suffixText}`;
    }
    used.add(next);

    if (next !== page.slug) {
      changes.push({
        id: page.id,
        tenant: page.tenant.code ?? page.tenant.name,
        title: page.title,
        from: page.slug,
        to: next,
      });
    }
  }

  console.log(`${changes.length} / ${pages.length} public page slugs will change.`);
  for (const change of changes) {
    console.log(`[${change.tenant}] ${change.title}`);
    console.log(`  ${change.from}`);
    console.log(`  -> ${change.to}`);
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to update the database.');
    return;
  }

  for (const change of changes) {
    await prisma.publicPage.update({
      where: { id: change.id },
      data: { slug: change.to },
    });
  }
  console.log(`Updated ${changes.length} public page slugs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
