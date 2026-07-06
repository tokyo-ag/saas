import { PrismaClient } from '@prisma/client';
import { toRomaji } from '../src/common/romaji';

const prisma = new PrismaClient();

function asciiSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120)
      .replace(/-+$/g, '') || ''
  );
}

async function slugBase(title: string, id: string) {
  const romaji = title.trim() ? await toRomaji(title) : '';
  return asciiSlug(romaji) || `post-${id.slice(0, 8)}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const posts = await prisma.blogPost.findMany({
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

  for (const post of posts) {
    const used = usedByTenant.get(post.tenantId) ?? new Set<string>();
    usedByTenant.set(post.tenantId, used);

    let next = await slugBase(post.title, post.id);
    const base = next;
    let suffix = 1;
    while (used.has(next)) {
      const suffixText = `-${suffix++}`;
      next = `${base.slice(0, 120 - suffixText.length).replace(/-+$/g, '')}${suffixText}`;
    }
    used.add(next);

    if (next !== post.slug) {
      changes.push({
        id: post.id,
        tenant: post.tenant.code ?? post.tenant.name,
        title: post.title,
        from: post.slug,
        to: next,
      });
    }
  }

  console.log(`${changes.length} / ${posts.length} blog post slugs will change.`);
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
    await prisma.blogPost.update({
      where: { id: change.id },
      data: { slug: change.to },
    });
  }
  console.log(`Updated ${changes.length} blog post slugs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
