import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

const POST_STATUS = ['draft', 'published'] as const;
type PostStatus = (typeof POST_STATUS)[number];

export class UpsertBlogPostDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags!: string[];

  @IsOptional()
  @IsIn(POST_STATUS)
  status?: PostStatus;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (p: PrismaService) => p.blogPost as any;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(title: string) {
    return title
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9぀-ヿ㐀-鿿]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || `post-${Date.now()}`;
  }

  private async uniqueSlug(tenantId: string, base: string, excludeId?: string) {
    let slug = base;
    let n = 0;
    while (true) {
      const existing = await this.prisma.blogPost.findFirst({
        where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      });
      if (!existing) return slug;
      slug = `${base}-${++n}`;
    }
  }

  async list(tenantId: string) {
    return db(this.prisma).findMany({
      where: { tenantId },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, title: true, slug: true, excerpt: true, body: true,
        tags: true, status: true, publishedAt: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async get(tenantId: string, id: string) {
    const post = await this.prisma.blogPost.findFirst({ where: { tenantId, id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(tenantId: string, dto: UpsertBlogPostDto) {
    const baseSlug = this.slugify(dto.title);
    const slug = await this.uniqueSlug(tenantId, baseSlug);
    const status = dto.status ?? 'draft';
    return db(this.prisma).create({
      data: {
        tenantId, title: dto.title.trim(), slug,
        body: dto.body,
        excerpt: dto.excerpt?.trim() || null,
        tags: dto.tags?.map((t: string) => t.trim()).filter(Boolean) ?? [],
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpsertBlogPostDto) {
    const existing = await this.prisma.blogPost.findFirst({ where: { tenantId, id } });
    if (!existing) throw new NotFoundException('Post not found');
    const status = dto.status ?? existing.status;
    const isPublishing = status === 'published' && existing.status !== 'published';
    return db(this.prisma).update({
      where: { id },
      data: {
        title: dto.title.trim(),
        body: dto.body,
        excerpt: dto.excerpt?.trim() || null,
        tags: dto.tags?.map((t: string) => t.trim()).filter(Boolean) ?? [],
        status,
        ...(isPublishing ? { publishedAt: new Date() } : {}),
        ...(status === 'draft' ? { publishedAt: null } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.blogPost.findFirst({ where: { tenantId, id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async listPublic(tenantId: string) {
    return db(this.prisma).findMany({
      where: { tenantId, status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, slug: true, excerpt: true,
        tags: true, publishedAt: true, createdAt: true,
      },
    });
  }

  async getPublic(tenantCode: string, slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        status: 'published',
        tenant: { code: tenantCode, deletedAt: null, bannedAt: null },
      },
      include: {
        tenant: {
          select: { id: true, code: true, name: true, lineDisplayName: true, linePictureUrl: true, iconUrl: true },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async listByTags(tags: string[], limit = 10) {
    const posts = await db(this.prisma).findMany({
      where: {
        status: 'published',
        tags: { hasSome: tags },
        tenant: { deletedAt: null, bannedAt: null, code: { not: null } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, slug: true, excerpt: true, body: true,
        tags: true, publishedAt: true,
        tenant: { select: { code: true, name: true, lineDisplayName: true, linePictureUrl: true, iconUrl: true } },
      },
    });
    return (posts as Array<{ body: string; [k: string]: unknown }>).map(({ body, ...post }) => ({
      ...post,
      coverImageUrl: (body as string).match(/!\[[^\]]*]\(([^)]+)\)/)?.[1] ?? null,
    }));
  }
}
