import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  private publicEndAt(heldAt: Date, endAt: Date | null) {
    if (!endAt || endAt <= heldAt) return null;
    return endAt;
  }

  @Get('events')
  async getEvents(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    const events = await this.prisma.event.findMany({
      where: {
        status: 'open',
        heldAt: { gte: new Date() },
        tenant: { deletedAt: null, bannedAt: null, code: { not: null } },
        ...(category ? { category } : {}),
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
      select: { themeColor: true },
    });
    return { themeColor: tenant?.themeColor ?? 'green' };
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
      tenantName: event.tenant.lineDisplayName ?? event.tenant.name,
      tenantIconUrl: event.tenant.linePictureUrl ?? event.tenant.iconUrl,
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
  async getTenants() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null, bannedAt: null, code: { not: null } },
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            liffAccesses: { where: { accessedAt: { gte: since } } },
          },
        },
      },
    });

    const ranked = tenants
      .map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description,
        lineDisplayName: t.lineDisplayName,
        linePictureUrl: t.linePictureUrl ?? t.iconUrl,
        memberCount: t._count.members,
        eventCount: t._count.events,
        accessCount: t._count.liffAccesses,
      }))
      .sort((a, b) => b.accessCount - a.accessCount);

    return ranked.slice(0, 10);
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
      lineDisplayName: tenant.lineDisplayName,
      linePictureUrl: tenant.linePictureUrl ?? tenant.iconUrl,
      memberCount: tenant._count.members,
      eventCount: tenant._count.events,
      accessCount: tenant._count.liffAccesses,
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
      dividerText: page.dividerText,
      textColor: page.textColor,
      accentColor: page.accentColor,
      fontFamily: page.fontFamily,
      titleSize: page.titleSize,
      titleAlign: page.titleAlign,
      bodySize: page.bodySize,
      layoutVariant: page.layoutVariant,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
      tenant: {
        ...page.tenant,
        linePictureUrl: page.tenant.linePictureUrl ?? page.tenant.iconUrl,
      },
    };
  }
}
