import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlogService } from '../blog/blog.service';
import { LiffGuard } from '../auth/liff.guard';

// Mirrors frontend/src/lib/lpTags.ts LOCATION_TAGS - kept in sync manually since Event.tags
// mixes location tags together with other tag groups (search tags etc.) in one flat array.
const LOCATION_TAG_SET = new Set([
  '東京',
  '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区',
  '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '千川',
  '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区',
  '武蔵野市', '三鷹市', '立川市', '八王子市', '町田市', '調布市', '吉祥寺',
  '埼玉', '千葉', '神奈川',
]);

type OfficialSiteRow = {
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

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blogService: BlogService,
  ) {}

  private firstMarkdownImage(body: string | null | undefined) {
    const match = body?.match(/!\[[^\]]*]\(([^)]+)\)/);
    return match?.[1] ?? null;
  }

  private isNonParagraphLine(line: string): boolean {
    return (
      /^#{1,6}\s/.test(line) || // heading
      /^\{\{/.test(line) || // cta/events/circles block markers
      /^!\[.*?\]\(.*?\)$/.test(line) || // image
      /^\[!\[.*?\]\(.*?\)\]\(.*?\)$/.test(line) || // linked image
      /^-(?:b|n)?\s/.test(line) // list item
    );
  }

  private deriveExcerpt(body: string | null | undefined): string {
    // Only the first paragraph is used, never concatenated with later paragraphs -
    // otherwise the excerpt ends up repeating content that also appears in full further down.
    const collected: string[] = [];
    for (const raw of (body ?? '').split('\n')) {
      const line = raw.trim();
      if (!line || this.isNonParagraphLine(line)) {
        if (collected.length > 0) break;
        continue;
      }
      collected.push(
        line
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[*_~`>|\\]/g, ''),
      );
    }
    return collected.join(' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  private publicEndAt(heldAt: Date, endAt: Date | null) {
    if (!endAt || endAt <= heldAt) return null;
    return endAt;
  }

  @UseGuards(LiffGuard)
  @Get('roster/:token')
  async getRoster(@Param('token') token: string) {
    const event = await this.prisma.event.findFirst({
      where: { rosterShareToken: token, rosterShareEnabled: true },
    });
    if (!event) throw new NotFoundException('名簿が見つかりません');

    const reservations = await this.prisma.reservation.findMany({
      where: { eventId: event.id, status: { not: 'cancelled' } },
      include: {
        member: { select: { name: true, grade: true, gender: true, level: true, comment: true, linePictureUrl: true } },
      },
      orderBy: [{ status: 'asc' }, { reservedAt: 'asc' }],
    });

    return {
      event: {
        title: event.title,
        heldAt: event.heldAt,
        location: event.location,
        locationHint: event.locationHint,
        levelEnabled: event.levelEnabled,
      },
      reservations: reservations.map((r) => ({
        name: r.member.name,
        grade: r.member.grade,
        gender: r.member.gender,
        level: r.member.level,
        comment: r.member.comment,
        linePictureUrl: r.member.linePictureUrl,
        status: r.status,
        waitlistOrder: r.waitlistOrder,
      })),
    };
  }

  private mapOfficialSite(row: OfficialSiteRow) {
    return {
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

  private mapOfficialArticle(row: OfficialArticleRow, includeBody = true) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt || this.deriveExcerpt(row.body),
      ...(includeBody ? { body: row.body } : {}),
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
      publishedAt: row.published_at,
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

  @Get('events')
  async getEvents(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('typeTags') typeTagsParam?: string,
  ) {
    // typeTags (団体種別) broadens the query to every activity category for tenants matching any
    // of the given team-type tags, instead of being restricted to one category - so when present
    // it takes over from `category` entirely rather than being combined with it.
    const typeTags = typeTagsParam ? typeTagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

    const events = await this.prisma.event.findMany({
      where: {
        status: 'open',
        heldAt: { gte: new Date() },
        tenant: {
          deletedAt: null,
          bannedAt: null,
          code: { not: null },
          ...(typeTags.length > 0 ? { typeTags: { hasSome: typeTags } } : {}),
        },
        ...(typeTags.length === 0 && category ? { category } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { heldAt: 'asc' },
      include: {
        tenant: {
          select: {
            id: true,
            code: true,
            name: true,
            lineDisplayName: true,
            linePictureUrl: true,
            iconUrl: true,
            liffId: true,
            _count: {
              select: {
                liffAccesses: {
                  where: {
                    accessedAt: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            },
          },
        },
        reservations: {
          where: {
            status: { in: ['reserved', 'attended', 'waiting_payment'] },
          },
          select: { id: true },
        },
      },
    });

    return events.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      tenantCode: e.tenant.code,
      title: e.title,
      heldAt: e.heldAt,
      location: e.location,
      locationHint: e.locationHint,
      price: e.price,
      priceMale: e.priceMale,
      priceFemale: e.priceFemale,
      capacity: e.capacity,
      reservedCount: e.reservations.length,
      iconUrl: e.iconUrl,
      imageUrl: e.imageUrl,
      category: e.category,
      tags: e.tags,
      viewCount: e.viewCount,
      tenantAccessCount: e.tenant._count.liffAccesses,
      tenant: {
        id: e.tenant.id,
        code: e.tenant.code,
        name: e.tenant.name,
        lineDisplayName: e.tenant.lineDisplayName,
        linePictureUrl: e.tenant.linePictureUrl,
        iconUrl: e.tenant.iconUrl,
      },
    }));
  }

  @Post('events/:id/view')
  async recordView(@Param('id') id: string) {
    await this.prisma.event.updateMany({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return { ok: true };
  }

  @Get('tenant-theme/:tenantId')
  async getTenantTheme(@Param('tenantId') tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { code: tenantId }],
        deletedAt: null,
        bannedAt: null,
      },
      select: {
        themeColor: true,
        publicPages: {
          where: { status: 'published' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            accentColor: true,
            backgroundColor: true,
            backgroundOpacity: true,
            navColor: true,
            navOpacity: true,
            footerText: true,
          },
        },
      },
    });
    const page = tenant?.publicPages?.[0] ?? null;
    return {
      themeColor: tenant?.themeColor ?? 'green',
      accentColor: page?.accentColor ?? null,
      backgroundColor: page?.backgroundColor ?? null,
      backgroundOpacity: page?.backgroundOpacity ?? null,
      navColor: page?.navColor ?? null,
      navOpacity: page?.navOpacity ?? null,
      footerText: page?.footerText ?? null,
    };
  }

  @Get('sitemap-events')
  async getSitemapEvents() {
    const events = await this.prisma.event.findMany({
      where: {
        status: 'open',
        heldAt: { gte: new Date() },
        tenant: { deletedAt: null, bannedAt: null, code: { not: null } },
      },
      select: {
        id: true,
        updatedAt: true,
        tenant: { select: { code: true } },
      },
      orderBy: { heldAt: 'asc' },
    });
    return events
      .filter((e) => e.tenant.code)
      .map((e) => ({
        id: e.id,
        tenantCode: e.tenant.code!,
        updatedAt: e.updatedAt,
      }));
  }

  @Get('sitemap-tenants')
  async getSitemapTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
        bannedAt: null,
        code: { not: null },
        events: { some: { status: 'open', heldAt: { gte: new Date() } } },
      },
      select: { code: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return tenants
      .filter((t) => t.code)
      .map((t) => ({ tenantCode: t.code!, updatedAt: t.updatedAt }));
  }

  @Get('sitemap-pages')
  async getSitemapPages() {
    const pages = await this.prisma.publicPage.findMany({
      where: {
        status: 'published',
        tenant: { deletedAt: null, bannedAt: null, code: { not: null } },
      },
      select: {
        slug: true,
        updatedAt: true,
        tenant: { select: { code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return pages
      .filter((p) => p.tenant.code)
      .map((p) => ({
        tenantCode: p.tenant.code!,
        slug: p.slug,
        updatedAt: p.updatedAt,
      }));
  }

  @Get('sitemap-blog-posts')
  async getSitemapBlogPosts() {
    const posts = await this.prisma.blogPost.findMany({
      where: {
        status: 'published',
        tenant: { deletedAt: null, bannedAt: null, code: { not: null } },
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        tenant: { select: { code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return posts
      .filter((p) => p.tenant.code)
      .map((p) => ({
        tenantCode: p.tenant.code!,
        slug: p.slug,
        updatedAt: p.updatedAt ?? p.publishedAt,
      }));
  }

  @Get('sitemap-official-articles')
  async getSitemapOfficialArticles() {
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      ${this.officialArticleSelect()}
      WHERE status = 'published'
      ORDER BY COALESCE(published_at, updated_at) DESC
    `);
    return rows.map((row) => ({
      slug: row.slug,
      category: row.category,
      areaTags: row.area_tags ?? [],
      updatedAt: row.updated_at,
    }));
  }

  @Get('official-site')
  async getOfficialSite() {
    const rows = await this.prisma.$queryRaw<OfficialSiteRow[]>(Prisma.sql`
      SELECT
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
      WHERE id = 'default' AND status = 'published'
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Official site not found');
    return this.mapOfficialSite(rows[0]);
  }

  @Get('official-articles')
  async listOfficialArticles(
    @Query('limit') limitParam?: string,
    @Query('category') category?: string,
    @Query('area') area?: string,
  ) {
    const requestedLimit = parseInt(limitParam ?? '20', 10);
    const limit = Math.min(
      Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1),
      150,
    );
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      ${this.officialArticleSelect()}
      WHERE status = 'published'
        ${category ? Prisma.sql`AND category = ${category}` : Prisma.empty}
        ${area ? Prisma.sql`AND ${area} = ANY(area_tags)` : Prisma.empty}
      ORDER BY COALESCE(published_at, updated_at) DESC
      LIMIT ${limit}
    `);
    return rows.map((row) => this.mapOfficialArticle(row, false));
  }

  @Get('official-articles/:slug')
  async getOfficialArticle(@Param('slug') slug: string) {
    const rows = await this.prisma.$queryRaw<OfficialArticleRow[]>(Prisma.sql`
      ${this.officialArticleSelect()}
      WHERE status = 'published' AND slug = ${slug}
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Article not found');
    return this.mapOfficialArticle(rows[0], true);
  }

  @Get('events/:eventId')
  async getEventDetail(@Param('eventId') eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenant: { deletedAt: null, bannedAt: null },
      },
      include: {
        tenant: {
          select: {
            code: true,
            name: true,
            lineDisplayName: true,
            linePictureUrl: true,
            iconUrl: true,
            liffId: true,
            publicPages: {
              take: 1,
              select: { footerText: true },
            },
          },
        },
        reservations: {
          where: {
            status: { in: ['reserved', 'attended', 'waiting_payment'] },
          },
          select: { id: true },
        },
        reviews: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            member: {
              select: {
                lineDisplayName: true,
                linePictureUrl: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    const isEnded = event.status !== 'open' || event.heldAt < new Date();
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      heldAt: event.heldAt,
      endAt: this.publicEndAt(event.heldAt, event.endAt),
      location: event.location,
      locationUrl: event.locationUrl,
      locationHint: event.locationHint,
      price: event.price,
      priceMale: event.priceMale,
      priceFemale: event.priceFemale,
      capacity: event.capacity,
      reservedCount: event.reservations.length,
      imageUrl: event.imageUrl,
      iconUrl: event.iconUrl,
      category: event.category,
      tags: event.tags,
      tenantCode: event.tenant.code,
      liffId: event.tenant.liffId,
      tenantName: event.tenant.lineDisplayName ?? event.tenant.name,
      tenantIconUrl: event.tenant.linePictureUrl ?? event.tenant.iconUrl,
      footerText: event.tenant.publicPages[0]?.footerText ?? null,
      reserveActionStyle: event.reserveActionStyle,
      isEnded,
      reviews: event.reviews.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        authorName: r.member.lineDisplayName ?? r.member.name ?? '参加者',
        authorIconUrl: r.member.linePictureUrl,
      })),
    };
  }

  @Get('tenants')
  async getTenants(
    @Query('activityTag') activityTag?: string,
    @Query('typeTags') typeTagsParam?: string,
    @Query('area') area?: string,
    @Query('limit') limitParam?: string,
  ) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const requestedLimit = parseInt(limitParam ?? '10', 10);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 10, 1), 50);
    // typeTags (団体種別: インカレサークル/学生団体/...) is an alternate filter to activityTag -
    // when given, it takes over entirely (OR-matched across every activity category) instead of
    // being combined with activityTag, since callers use it specifically to broaden beyond one category.
    const typeTags = typeTagsParam ? typeTagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
        bannedAt: null,
        code: { not: null },
        ...(typeTags.length > 0 ? { typeTags: { hasSome: typeTags } } : activityTag ? { activityTags: { has: activityTag } } : {}),
        ...(area ? { events: { some: { tags: { has: area }, status: { not: 'draft' } } } } : {}),
      },
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            liffAccesses: { where: { accessedAt: { gte: since } } },
          },
        },
        // Search tags (初心者大歓迎 etc.) live on Event, not Tenant - collect them from the
        // same events that qualify this tenant for the current area, so callers (e.g. the
        // area-hub FAQ) can tell what the tenant's local activity actually offers.
        events: {
          where: {
            status: { not: 'draft' },
            ...(area ? { tags: { has: area } } : {}),
          },
          select: { tags: true },
        },
      },
    });

    const ranked = tenants
      .map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description,
        tags: t.tags,
        typeTags: t.typeTags,
        activityTags: t.activityTags,
        eventTags: Array.from(new Set(t.events.flatMap((e) => e.tags))),
        lineDisplayName: t.lineDisplayName,
        linePictureUrl: t.linePictureUrl ?? t.iconUrl,
        memberCount: t._count.members,
        eventCount: t._count.events,
        accessCount: t._count.liffAccesses,
        updatedAt: t.updatedAt,
      }))
      .sort((a, b) => b.accessCount - a.accessCount);

    return ranked.slice(0, limit);
  }

  @Get('tenants/area-tag-counts')
  async getTenantAreaTagCounts(@Query('category') category?: string) {
    if (!category) return [];

    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
        bannedAt: null,
        code: { not: null },
        activityTags: { has: category },
      },
      select: {
        id: true,
        events: {
          where: { status: { not: 'draft' } },
          select: { tags: true },
        },
      },
    });

    const tenantCountByArea = new Map<string, number>();
    for (const tenant of tenants) {
      const areasForTenant = new Set<string>();
      for (const event of tenant.events) {
        for (const tag of event.tags) {
          if (LOCATION_TAG_SET.has(tag)) areasForTenant.add(tag);
        }
      }
      for (const area of areasForTenant) {
        tenantCountByArea.set(area, (tenantCountByArea.get(area) ?? 0) + 1);
      }
    }

    return Array.from(tenantCountByArea.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'ja'));
  }

  @Get('area-hub-settings')
  async getAreaHubSetting(
    @Query('category') category?: string,
    @Query('area') area?: string,
  ) {
    if (!category) return null;
    return this.prisma.areaHubSetting.findUnique({
      where: { category_area: { category, area: area ?? '' } },
    });
  }

  @Get('tenants/:tenantCode')
  async getTenantByCode(@Param('tenantCode') tenantCode: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tenant = await this.prisma.tenant.findFirst({
      where: { code: tenantCode, deletedAt: null, bannedAt: null },
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            liffAccesses: { where: { accessedAt: { gte: since } } },
          },
        },
        events: {
          where: { status: 'open', heldAt: { gte: new Date() } },
          orderBy: { heldAt: 'asc' },
          include: {
            reservations: {
              where: {
                status: { in: ['reserved', 'attended', 'waiting_payment'] },
              },
              select: { id: true },
            },
          },
        },
        publicPages: {
          where: { status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            seoDescription: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const tenantName = tenant.lineDisplayName ?? tenant.name;
    const publicTenant = {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      description: tenant.description,
      tags: tenant.tags,
      typeTags: tenant.typeTags,
      activityTags: tenant.activityTags,
      lineDisplayName: tenant.lineDisplayName,
      linePictureUrl: tenant.linePictureUrl ?? tenant.iconUrl,
      memberCount: tenant._count.members,
      eventCount: tenant._count.events,
      accessCount: tenant._count.liffAccesses,
      liffId: tenant.liffId,
      pages: tenant.publicPages,
    };

    return {
      ...publicTenant,
      events: tenant.events.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        tenantCode: tenant.code,
        title: e.title,
        heldAt: e.heldAt,
        location: e.location,
        locationHint: e.locationHint,
        price: e.price,
        priceMale: e.priceMale,
        priceFemale: e.priceFemale,
        capacity: e.capacity,
        reservedCount: e.reservations.length,
        iconUrl: e.iconUrl,
        imageUrl: e.imageUrl,
        category: e.category,
        tags: e.tags,
        viewCount: e.viewCount,
        tenantAccessCount: tenant._count.liffAccesses,
        tenant: {
          id: tenant.id,
          code: tenant.code,
          name: tenant.name,
          lineDisplayName: tenantName,
          linePictureUrl: tenant.linePictureUrl ?? tenant.iconUrl,
          iconUrl: tenant.iconUrl,
        },
      })),
    };
  }

  @Get('tenants/:tenantCode/pages/:slug')
  async getTenantPage(
    @Param('tenantCode') tenantCode: string,
    @Param('slug') slug: string,
  ) {
    const page = await this.prisma.publicPage.findFirst({
      where: {
        slug,
        status: 'published',
        tenant: { code: tenantCode, deletedAt: null, bannedAt: null },
      },
      include: {
        tenant: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            lineDisplayName: true,
            linePictureUrl: true,
            iconUrl: true,
          },
        },
      },
    });

    if (!page) throw new NotFoundException('Public page not found');

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      subtitle: page.subtitle,
      body: page.body,
      coverImageUrl: page.coverImageUrl,
      imageUrls: page.imageUrls,
      imageCaptions: page.imageCaptions,
      dividerText: page.dividerText,
      textColor: page.textColor,
      accentColor: page.accentColor,
      backgroundColor: page.backgroundColor,
      backgroundOpacity:
        (page as { backgroundOpacity?: number | null }).backgroundOpacity ??
        null,
      navColor: page.navColor,
      navOpacity: page.navOpacity,
      imageLayout: page.imageLayout,
      heroImageMode: page.heroImageMode,
      heroNavPosition: page.heroNavPosition,
      heroImagePosition: page.heroImagePosition,
      heroTextPosition: page.heroTextPosition,
      heroTextX: page.heroTextX,
      heroTextY: page.heroTextY,
      heroTextWidth: page.heroTextWidth,
      buttonBgColor: page.buttonBgColor,
      buttonBgOpacity: page.buttonBgOpacity,
      buttonTextOpacity: page.buttonTextOpacity,
      blocks: page.blocks,
      heroOverlayOpacity: page.heroOverlayOpacity,
      heroOverlayColor: page.heroOverlayColor,
      reserveViewStyle: page.reserveViewStyle,
      fontFamily: page.fontFamily,
      titleFont: page.titleFont,
      titleColor: page.titleColor,
      subtitleFont: page.subtitleFont,
      subtitleSize: page.subtitleSize,
      subtitleColor: page.subtitleColor,
      titleSize: page.titleSize,
      titleAlign: page.titleAlign,
      bodySize: page.bodySize,
      layoutVariant: page.layoutVariant,
      aboutLabel: page.aboutLabel,
      reserveLabel: page.reserveLabel,
      blogLabel: page.blogLabel,
      contactLabel: page.contactLabel,
      buttonStyle: page.buttonStyle,
      buttonLayout: page.buttonLayout,
      buttonOpacity: page.buttonOpacity,
      buttonRadius: page.buttonRadius,
      buttonSize: (page as { buttonSize?: number | null }).buttonSize ?? null,
      subtitleMarginTop: page.subtitleMarginTop,
      headerText: page.headerText,
      footerText: page.footerText,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      orgNameDisplayType: page.orgNameDisplayType,
      orgLogoWordmarkUrl: page.orgLogoWordmarkUrl,
      orgLogoWordmarkAlt: page.orgLogoWordmarkAlt,
      orgLogoWordmarkSize:
        (page as { orgLogoWordmarkSize?: number | null }).orgLogoWordmarkSize ??
        null,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
      tenant: {
        ...page.tenant,
        linePictureUrl: page.tenant.linePictureUrl ?? page.tenant.iconUrl,
      },
    };
  }

  @Get('tenants/:tenantCode/reviews')
  async listTenantReviews(@Param('tenantCode') tenantCode: string) {
    const reviews = await this.prisma.tenantReview.findMany({
      where: {
        isPublished: true,
        tenant: { code: tenantCode, deletedAt: null, bannedAt: null },
      },
      include: { member: { select: { name: true, grade: true, linePictureUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return reviews.map((review) => ({
      id: review.id,
      content: review.content,
      createdAt: review.createdAt,
      authorName: review.member.name ?? '参加者',
      authorGrade: review.member.grade,
      authorIconUrl: review.member.linePictureUrl,
    }));
  }

  @Get('tenants/:tenantCode/blog')
  async listBlogPosts(@Param('tenantCode') tenantCode: string) {
    const posts = await this.prisma.blogPost.findMany({
      where: {
        status: 'published',
        tenant: { code: tenantCode, deletedAt: null, bannedAt: null },
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        body: true,
        tags: true,
        publishedAt: true,
        createdAt: true,
      },
    });
    return posts.map(({ body, ...post }) => ({
      ...post,
      coverImageUrl: this.firstMarkdownImage(body),
    }));
  }

  @Get('tenants/:tenantCode/blog/:slug')
  async getBlogPost(
    @Param('tenantCode') tenantCode: string,
    @Param('slug') slug: string,
  ) {
    return this.blogService.getPublic(tenantCode, slug);
  }

  @Get('blog')
  async listBlogByTags(
    @Query('tags') tagsParam: string,
    @Query('limit') limitParam?: string,
  ) {
    const tags = tagsParam
      ? tagsParam
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    if (tags.length === 0) return [];
    const limit = Math.min(parseInt(limitParam ?? '10', 10) || 10, 30);
    return this.blogService.listByTags(tags, limit);
  }
}
