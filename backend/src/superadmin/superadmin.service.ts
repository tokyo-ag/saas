import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
  IsArray,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Mirrors frontend/src/lib/lpTags.ts ACTIVITY_TAGS/ACTIVITY_TAG_EVENT_CATEGORY/LOCATION_TAGS -
// kept in sync manually since the backend has no access to frontend constants.
const ACTIVITY_TAGS = new Set(['交流会', 'バドミントン', 'フットサル', 'バスケ', 'バレー']);
const ACTIVITY_TAG_EVENT_CATEGORY: Record<string, string> = {
  '交流会': 'meetup',
  'バドミントン': 'badminton',
  'フットサル': 'futsal',
  'バスケ': 'basketball',
  'バレー': 'volleyball',
};
const EVENT_CATEGORY_TO_ACTIVITY_TAG: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVITY_TAG_EVENT_CATEGORY).map(([tag, eventCategory]) => [eventCategory, tag]),
);
const LOCATION_TAG_SET = new Set([
  '東京',
  '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区',
  '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '千川',
  '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区',
  '武蔵野市', '三鷹市', '立川市', '八王子市', '町田市', '調布市', '吉祥寺',
  '埼玉', '千葉', '神奈川',
]);

export class CreateTenantDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?:
    | 'free'
    | 'standard'
    | 'pro';
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['free', 'standard', 'pro']) plan?:
    | 'free'
    | 'standard'
    | 'pro';
  @IsOptional() @IsString() code?: string;
}

export class BanUserDto {
  @IsString() lineUserId: string;
  @IsOptional() @IsString() reason?: string;
}

export class UpdateOfficialSiteDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroLead?: string;
  @IsOptional() @IsString() primaryCtaLabel?: string;
  @IsOptional() @IsString() primaryCtaHref?: string;
  @IsOptional() @IsString() secondaryCtaLabel?: string;
  @IsOptional() @IsString() secondaryCtaHref?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

export class UpsertOfficialArticleDto {
  @IsString() title: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsString() body: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) areaTags?: string[];
  @IsOptional() @IsBoolean() isPillar?: boolean;
  @IsOptional() @IsString() pillarSlug?: string;
  @IsOptional() @IsString() targetKeyword?: string;
  @IsOptional() @IsString() ctaTitle?: string;
  @IsOptional() @IsString() ctaDescription?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaHref?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsOptional() @IsString() status?: string;
}

export class UpsertAreaHubSettingDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() faqEnabled?: boolean;
  @IsOptional() @IsInt() relatedArticleLimit?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) nearbyAreas?: string[];
  @IsOptional() @IsBoolean() indexable?: boolean;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

type OfficialSiteRow = {
  id: string;
  status: string;
  hero_title: string;
  hero_lead: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: Date;
};

type OfficialArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  area_tags: string[];
  is_pillar: boolean;
  pillar_slug: string | null;
  target_keyword: string | null;
  cta_title: string | null;
  cta_description: string | null;
  cta_label: string | null;
  cta_href: string | null;
  og_image_url: string | null;
  status: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class SuperadminService implements OnApplicationBootstrap {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async onApplicationBootstrap() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, code: true },
    });
    for (const t of tenants) {
      if (!t.code || !/^\d{8}$/.test(t.code)) {
        const code = await this.generateUniqueCode();
        await this.prisma.tenant.update({
          where: { id: t.id },
          data: { code },
        });
      }
    }
    await this.backfillPublicPageCardColors();
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        plan: true,
        bannedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        _count: { select: { members: true } },
        organizerAccounts: { select: { email: true }, take: 1 },
      },
    });
    return tenants.map(({ _count, organizerAccounts, ...t }) => ({
      ...t,
      memberCount: _count.members,
      organizerEmail: organizerAccounts[0]?.email ?? null,
    }));
  }

  async deactivateTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async banTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: { bannedAt: new Date(), deletedAt: new Date() },
    });
  }

  async restoreTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.bannedAt)
      throw new BadRequestException(
        'この団体は永久BANされており復元できません',
      );
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await this.prisma.tenant.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('コード生成に失敗しました');
  }

  async createTenant(dto: CreateTenantDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.organizerAccount.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const id = `tenant-${Date.now()}`;
    const code = await this.generateUniqueCode();
    const tenant = await this.prisma.tenant.create({
      data: {
        id,
        code,
        name: dto.name,
        description: dto.description,
        plan: dto.plan ?? 'free',
        organizerAccounts: {
          create: {
            email: normalizedEmail,
            passwordHash,
            emailVerifiedAt: new Date(),
          },
        },
      },
      select: { id: true, name: true, code: true, plan: true, createdAt: true },
    });
    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.plan !== undefined && { plan: dto.plan }),
        ...(dto.code !== undefined && {
          code: dto.code.trim().toLowerCase() || null,
        }),
      },
      select: { id: true, name: true, code: true, plan: true, updatedAt: true },
    });
  }

  async deleteTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.prisma.reservation.deleteMany({ where: { tenantId: id } });
    await this.prisma.member.deleteMany({ where: { tenantId: id } });
    await this.prisma.event.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'deleted' };
  }

  async listBannedUsers() {
    return this.prisma.bannedLineUser.findMany({
      orderBy: { bannedAt: 'desc' },
    });
  }

  async banUser(dto: BanUserDto) {
    return this.prisma.bannedLineUser.upsert({
      where: { lineUserId: dto.lineUserId },
      create: { lineUserId: dto.lineUserId, reason: dto.reason },
      update: { reason: dto.reason, bannedAt: new Date() },
    });
  }

  async impersonate(tenantId: string): Promise<{ token: string }> {
    const account = await this.prisma.organizerAccount.findFirst({
      where: { tenantId },
    });
    if (!account)
      throw new NotFoundException('この団体にアカウントがありません');
    const token = this.jwt.sign({ tenantId, accountId: account.id });
    return { token };
  }

  async unbanUser(lineUserId: string) {
    const banned = await this.prisma.bannedLineUser.findUnique({
      where: { lineUserId },
    });
    if (!banned) throw new NotFoundException('Banned user not found');
    await this.prisma.bannedLineUser.delete({ where: { lineUserId } });
    return { message: 'unbanned' };
  }

  async getSupportThreads() {
    const messages = await this.prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const threadMap = new Map<
      string,
      {
        lineUserId: string;
        tenantId: string | null;
        lastMessage: string;
        lastAt: Date;
        unread: number;
      }
    >();
    for (const m of messages) {
      if (!threadMap.has(m.lineUserId)) {
        threadMap.set(m.lineUserId, {
          lineUserId: m.lineUserId,
          tenantId: m.tenantId,
          lastMessage: m.content,
          lastAt: m.createdAt,
          unread: 0,
        });
      }
      if (m.fromUser && !m.read) {
        threadMap.get(m.lineUserId)!.unread++;
      }
    }
    return Array.from(threadMap.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
    );
  }

  async getSupportMessages(lineUserId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { lineUserId, fromUser: true, read: false },
      data: { read: true },
    });
    return this.prisma.supportMessage.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getErrorLogs() {
    return this.prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async clearErrorLogs() {
    await this.prisma.errorLog.deleteMany();
    return { message: 'cleared' };
  }

  async replySupportMessage(lineUserId: string, content: string) {
    const latest = await this.prisma.supportMessage.findFirst({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true },
    });
    return this.prisma.supportMessage.create({
      data: {
        lineUserId,
        tenantId: latest?.tenantId ?? null,
        content,
        fromUser: false,
      },
    });
  }

  private mapOfficialSite(row: OfficialSiteRow) {
    return {
      id: row.id,
      status: row.status,
      heroTitle: row.hero_title,
      heroLead: row.hero_lead,
      primaryCtaLabel: row.primary_cta_label,
      primaryCtaHref: row.primary_cta_href,
      secondaryCtaLabel: row.secondary_cta_label,
      secondaryCtaHref: row.secondary_cta_href,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      updatedAt: row.updated_at,
    };
  }

  private mapOfficialArticle(row: OfficialArticleRow) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      body: row.body,
      category: row.category,
      areaTags: row.area_tags ?? [],
      isPillar: row.is_pillar,
      pillarSlug: row.pillar_slug,
      targetKeyword: row.target_keyword,
      ctaTitle: row.cta_title,
      ctaDescription: row.cta_description,
      ctaLabel: row.cta_label,
      ctaHref: row.cta_href,
      ogImageUrl: row.og_image_url,
      status: row.status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private officialArticleSelect() {
    return Prisma.sql`
      SELECT
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        area_tags,
        is_pillar,
        pillar_slug,
        target_keyword,
        cta_title,
        cta_description,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
      FROM official_articles
    `;
  }

  private normalizeStatus(status: string | undefined) {
    return status === 'draft' ? 'draft' : 'published';
  }

  private slugify(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || `article-${Date.now()}`
    );
  }

  private async uniqueOfficialArticleSlug(base: string, excludeId?: string) {
    let slug = base;
    let n = 0;
    while (true) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        excludeId
          ? Prisma.sql`SELECT id FROM official_articles WHERE slug = ${slug} AND id <> ${excludeId} LIMIT 1`
          : Prisma.sql`SELECT id FROM official_articles WHERE slug = ${slug} LIMIT 1`,
      );
      if (rows.length === 0) return slug;
      slug = `${base}-${++n}`;
    }
  }

  async getOfficialSite() {
    const rows = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      SELECT
        id,
        status,
        hero_title,
        hero_lead,
        primary_cta_label,
        primary_cta_href,
        secondary_cta_label,
        secondary_cta_href,
        seo_title,
        seo_description,
        updated_at
      FROM official_site_settings
      WHERE id = 'default'
      LIMIT 1
    `);

    if (rows[0]) return this.mapOfficialSite(rows[0]);

    const created = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      INSERT INTO official_site_settings (id)
      VALUES ('default')
      ON CONFLICT (id) DO NOTHING
      RETURNING
        id,
        status,
        hero_title,
        hero_lead,
        primary_cta_label,
        primary_cta_href,
        secondary_cta_label,
        secondary_cta_href,
        seo_title,
        seo_description,
        updated_at
    `);
    if (!created[0]) throw new NotFoundException('Official site not found');
    return this.mapOfficialSite(created[0]);
  }

  async updateOfficialSite(dto: UpdateOfficialSiteDto) {
    const current = await this.getOfficialSite();
    const status = this.normalizeStatus(dto.status ?? current.status);
    const rows = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      UPDATE official_site_settings
      SET
        status = ${status},
        hero_title = ${dto.heroTitle?.trim() || current.heroTitle},
        hero_lead = ${dto.heroLead?.trim() || current.heroLead},
        primary_cta_label = ${dto.primaryCtaLabel?.trim() || current.primaryCtaLabel},
        primary_cta_href = ${dto.primaryCtaHref?.trim() || current.primaryCtaHref},
        secondary_cta_label = ${dto.secondaryCtaLabel?.trim() || current.secondaryCtaLabel},
        secondary_cta_href = ${dto.secondaryCtaHref?.trim() || current.secondaryCtaHref},
        seo_title = ${dto.seoTitle?.trim() || null},
        seo_description = ${dto.seoDescription?.trim() || null},
        updated_at = NOW()
      WHERE id = 'default'
      RETURNING
        id,
        status,
        hero_title,
        hero_lead,
        primary_cta_label,
        primary_cta_href,
        secondary_cta_label,
        secondary_cta_href,
        seo_title,
        seo_description,
        updated_at
    `);
    return this.mapOfficialSite(rows[0]);
  }

  async listOfficialArticles() {
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      ${this.officialArticleSelect()}
      ORDER BY updated_at DESC
    `);
    return rows.map((row) => this.mapOfficialArticle(row));
  }

  // Read-only summary of which /guide/tag/[category]?area=... hub pages actually have
  // real content behind them, since those pages are auto-generated from live data
  // (not stored as articles) and are otherwise invisible from the admin side.
  async getAreaHubSummary() {
    const [articles, tenants, events] = await Promise.all([
      this.prisma.officialArticle.findMany({
        where: { status: 'published' },
        select: { category: true, areaTags: true },
      }),
      this.prisma.tenant.findMany({
        where: { deletedAt: null, bannedAt: null, code: { not: null } },
        select: {
          activityTags: true,
          events: { where: { status: { not: 'draft' } }, select: { tags: true } },
        },
      }),
      this.prisma.event.findMany({
        where: {
          status: 'open',
          heldAt: { gte: new Date() },
          tenant: { deletedAt: null, bannedAt: null, code: { not: null } },
        },
        select: { category: true, tags: true },
      }),
    ]);

    type Bucket = { category: string; area: string; articleCount: number; circleCount: number; eventCount: number };
    const buckets = new Map<string, Map<string, Bucket>>();
    const bucketFor = (category: string, area: string) => {
      let byArea = buckets.get(category);
      if (!byArea) {
        byArea = new Map<string, Bucket>();
        buckets.set(category, byArea);
      }
      let bucket = byArea.get(area);
      if (!bucket) {
        bucket = { category, area, articleCount: 0, circleCount: 0, eventCount: 0 };
        byArea.set(area, bucket);
      }
      return bucket;
    };

    // Seed every known category x area combination up front (0/0/0) so pages that don't have
    // real data yet still show up here and can be pre-configured, not just ones already in use.
    for (const category of ACTIVITY_TAGS) {
      for (const area of LOCATION_TAG_SET) {
        bucketFor(category, area);
      }
    }

    for (const article of articles) {
      if (!article.category) continue;
      for (const area of article.areaTags) {
        if (!LOCATION_TAG_SET.has(area)) continue;
        bucketFor(article.category, area).articleCount += 1;
      }
    }

    for (const tenant of tenants) {
      const categories = tenant.activityTags.filter((tag) => ACTIVITY_TAGS.has(tag));
      if (categories.length === 0) continue;
      const areasForTenant = new Set<string>();
      for (const event of tenant.events) {
        for (const tag of event.tags) {
          if (LOCATION_TAG_SET.has(tag)) areasForTenant.add(tag);
        }
      }
      for (const category of categories) {
        for (const area of areasForTenant) {
          bucketFor(category, area).circleCount += 1;
        }
      }
    }

    for (const event of events) {
      const category = event.category ? EVENT_CATEGORY_TO_ACTIVITY_TAG[event.category] : undefined;
      if (!category) continue;
      for (const tag of event.tags) {
        if (!LOCATION_TAG_SET.has(tag)) continue;
        bucketFor(category, tag).eventCount += 1;
      }
    }

    return Array.from(buckets.values())
      .flatMap((byArea) => Array.from(byArea.values()))
      .map((bucket) => ({ ...bucket, total: bucket.articleCount + bucket.circleCount + bucket.eventCount }))
      .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'ja') || a.area.localeCompare(b.area, 'ja'));
  }

  async getAreaHubSetting(category: string, area: string) {
    return this.prisma.areaHubSetting.findUnique({
      where: { category_area: { category, area } },
    });
  }

  async upsertAreaHubSetting(category: string, area: string, dto: UpsertAreaHubSettingDto) {
    const data = {
      description: dto.description?.trim() || null,
      faqEnabled: dto.faqEnabled ?? null,
      relatedArticleLimit: dto.relatedArticleLimit ?? null,
      nearbyAreas: (dto.nearbyAreas ?? []).filter(Boolean),
      indexable: dto.indexable ?? null,
      seoTitle: dto.seoTitle?.trim() || null,
      seoDescription: dto.seoDescription?.trim() || null,
    };
    return this.prisma.areaHubSetting.upsert({
      where: { category_area: { category, area } },
      create: { category, area, ...data },
      update: data,
    });
  }

  async createOfficialArticle(dto: UpsertOfficialArticleDto) {
    if (!dto.title?.trim() || !dto.body?.trim()) {
      throw new BadRequestException('Title and body are required');
    }
    const status = this.normalizeStatus(dto.status);
    const slug = await this.uniqueOfficialArticleSlug(
      this.slugify(dto.slug?.trim() || dto.title),
    );
    const areaTags = (dto.areaTags ?? []).map((t) => t.trim()).filter(Boolean);
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      INSERT INTO official_articles (
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        area_tags,
        is_pillar,
        pillar_slug,
        target_keyword,
        cta_title,
        cta_description,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
      )
      VALUES (
        ${randomUUID()},
        ${dto.title.trim()},
        ${slug},
        ${dto.excerpt?.trim() || null},
        ${dto.body.trim()},
        ${dto.category?.trim() || null},
        ${areaTags},
        ${dto.isPillar ?? false},
        ${dto.pillarSlug?.trim() || null},
        ${dto.targetKeyword?.trim() || null},
        ${dto.ctaTitle?.trim() || null},
        ${dto.ctaDescription?.trim() || null},
        ${dto.ctaLabel?.trim() || null},
        ${dto.ctaHref?.trim() || null},
        ${dto.ogImageUrl?.trim() || null},
        ${status},
        ${status === 'published' ? new Date() : null},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        area_tags,
        is_pillar,
        pillar_slug,
        target_keyword,
        cta_title,
        cta_description,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
    `);
    return this.mapOfficialArticle(rows[0]);
  }

  async updateOfficialArticle(id: string, dto: UpsertOfficialArticleDto) {
    const existing = await this.prisma.$queryRaw<
      OfficialArticleRow[]
    >(Prisma.sql`
      ${this.officialArticleSelect()}
      WHERE id = ${id}
      LIMIT 1
    `);
    if (!existing[0]) throw new NotFoundException('Article not found');
    const current = existing[0];
    const status = this.normalizeStatus(dto.status ?? current.status);
    const slug = await this.uniqueOfficialArticleSlug(
      this.slugify(dto.slug?.trim() || current.slug || dto.title),
      id,
    );
    const publishedAt =
      status === 'draft' ? null : (current.published_at ?? new Date());

    const areaTags = dto.areaTags
      ? dto.areaTags.map((t) => t.trim()).filter(Boolean)
      : current.area_tags;
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      UPDATE official_articles
      SET
        title = ${dto.title?.trim() || current.title},
        slug = ${slug},
        excerpt = ${dto.excerpt?.trim() || null},
        body = ${dto.body?.trim() || current.body},
        category = ${dto.category?.trim() || null},
        area_tags = ${areaTags},
        is_pillar = ${dto.isPillar ?? current.is_pillar},
        pillar_slug = ${dto.pillarSlug?.trim() || null},
        target_keyword = ${dto.targetKeyword?.trim() || null},
        cta_title = ${dto.ctaTitle?.trim() || null},
        cta_description = ${dto.ctaDescription?.trim() || null},
        cta_label = ${dto.ctaLabel?.trim() || null},
        cta_href = ${dto.ctaHref?.trim() || null},
        og_image_url = ${dto.ogImageUrl?.trim() || null},
        status = ${status},
        published_at = ${publishedAt},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        title,
        slug,
        excerpt,
        body,
        category,
        area_tags,
        is_pillar,
        pillar_slug,
        target_keyword,
        cta_title,
        cta_description,
        cta_label,
        cta_href,
        og_image_url,
        status,
        published_at,
        created_at,
        updated_at
    `);
    return this.mapOfficialArticle(rows[0]);
  }

  async deleteOfficialArticle(id: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM official_articles WHERE id = ${id}
    `);
    return { ok: true };
  }

  // 公開サイトの各種色をテーマカラー(accentColor)連動のデフォルトへ切り替えるにあたり、
  // 既存団体の見た目を変えないよう、未設定の項目へ旧デフォルト値を明示的に書き込む
  // 移行処理。onApplicationBootstrapから毎回自動実行されるため、デフォルト値を
  // 切り替えるコードより必ず先に反映される（手動ボタン操作の完了に依存しない）。
  //
  // 注意: この処理はテーマ連動の切り替え(2026-07-29)より前から存在する団体だけを対象にする。
  // 起動のたびに毎回実行されるため、対象を絞らないと新規団体まで「未設定=旧デフォルト」に
  // 固定されてしまい、新規団体がテーマ連動の恩恵を永久に受けられなくなってしまう。
  async backfillPublicPageCardColors() {
    const THEME_SYNC_CUTOFF = new Date('2026-07-29T00:00:00.000Z');
    const pages = await this.prisma.publicPage.findMany({
      where: { tenant: { createdAt: { lt: THEME_SYNC_CUTOFF } } },
      select: {
        id: true,
        footerText: true,
        blocks: true,
        navColor: true,
        buttonBgColor: true,
        buttonBgOpacity: true,
        accentColor: true,
      },
    });
    let updated = 0;
    for (const page of pages) {
      let footer: Record<string, unknown> = {};
      try {
        footer = page.footerText ? JSON.parse(page.footerText) : {};
      } catch {
        footer = {};
      }
      let changed = false;
      if (!footer.blogPostCardBg || typeof footer.blogPostCardBg !== 'string' || !footer.blogPostCardBg.trim()) {
        footer.blogPostCardBg = '#ffffff';
        changed = true;
      }
      if (!footer.reserveEventCardBg || typeof footer.reserveEventCardBg !== 'string' || !footer.reserveEventCardBg.trim()) {
        footer.reserveEventCardBg = '#ffffff';
        changed = true;
      }

      let blocks: any[] | null = null;
      if (Array.isArray(page.blocks)) {
        let blocksChanged = false;
        blocks = (page.blocks as any[]).map((block) => {
          if (block?.type === 'faq' && (!block.faqCardBg || typeof block.faqCardBg !== 'string' || !block.faqCardBg.trim())) {
            blocksChanged = true;
            return { ...block, faqCardBg: '#F9FAFB' };
          }
          return block;
        });
        if (blocksChanged) changed = true; else blocks = null;
      }

      // ナビ背景色: 未設定のものは旧デフォルト値(#F3F4F6)を明示化し、
      // 将来navColorのデフォルトをaccentColor連動に変えても見た目が変わらないようにする。
      const navColorFreeze = !page.navColor || !page.navColor.trim() ? '#F3F4F6' : null;
      if (navColorFreeze) changed = true;

      // ナビボタンの背景(塗りつぶし)は現状「塗りつぶし色が未設定＝塗りつぶしなし」という扱いで、
      // 不透明度の値(多くは管理画面で一度保存した際に既定値100が入っている)自体には意味がない。
      // buttonBgColorのデフォルトをaccentColorへ変えると、この既存の100という値がそのまま
      // 「不透明度100%で塗りつぶす」という新しい意味を持ってしまうため、塗りつぶし色が未設定の
      // 団体は不透明度の現在値に関わらず0に上書きして「塗りつぶしなし」を維持する。
      const buttonBgOpacityFreeze = !page.buttonBgColor || !page.buttonBgColor.trim() ? 0 : null;
      if (buttonBgOpacityFreeze !== null && page.buttonBgOpacity !== buttonBgOpacityFreeze) changed = true;

      // お問い合わせボタンの色: 未設定の場合、これまでは常にテーマカラー(accentColor)で
      // 表示されていた。「中の色」(buttonBgColor)をcontactColorより優先度の高いフォール
      // バックとして挟み込むと、buttonBgColorだけ設定済みの団体は見た目が変わってしまうため、
      // 未設定の団体はその時点のaccentColor値をcontactColorへ明示的に書き込んで固定する。
      const contactColorFreeze =
        !footer.contactColor || typeof footer.contactColor !== 'string' || !footer.contactColor.trim()
          ? page.accentColor?.trim() || '#06C755'
          : null;
      if (contactColorFreeze) {
        footer.contactColor = contactColorFreeze;
        changed = true;
      }

      if (!changed) continue;
      await this.prisma.publicPage.update({
        where: { id: page.id },
        data: {
          footerText: JSON.stringify(footer),
          ...(blocks ? { blocks } : {}),
          ...(navColorFreeze ? { navColor: navColorFreeze } : {}),
          ...(buttonBgOpacityFreeze !== null ? { buttonBgOpacity: buttonBgOpacityFreeze } : {}),
        },
      });
      updated++;
    }
    return { total: pages.length, updated };
  }
}
