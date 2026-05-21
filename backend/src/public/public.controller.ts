import { Controller, Get, Post, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('events')
  async getEvents(
    @Query('anonymousId') anonymousId?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const events = await this.prisma.event.findMany({
      where: {
        status: 'open',
        heldAt: { gte: new Date() },
        tenant: { deletedAt: null },
        ...(category ? { category } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { heldAt: 'asc' },
      include: {
        tenant: {
          select: { id: true, name: true, lineDisplayName: true, linePictureUrl: true, iconUrl: true },
        },
        reservations: {
          where: { status: { in: ['reserved', 'attended', 'waiting_payment'] } },
          select: { id: true },
        },
        _count: { select: { likes: true } },
        likes: {
          where: { createdAt: { gte: monthStart } },
          select: { id: true },
        },
      },
    });

    const userLikedIds = anonymousId
      ? new Set(
          (await this.prisma.eventLike.findMany({
            where: { anonymousId, eventId: { in: events.map((e) => e.id) } },
            select: { eventId: true },
          })).map((l) => l.eventId),
        )
      : new Set<string>();

    return events.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      title: e.title,
      heldAt: e.heldAt,
      location: e.location,
      price: e.price,
      capacity: e.capacity,
      reservedCount: e.reservations.length,
      iconUrl: e.iconUrl,
      imageUrl: e.imageUrl,
      category: e.category,
      tags: e.tags,
      likeCount: e._count.likes,
      monthlyLikeCount: e.likes.length,
      userLiked: userLikedIds.has(e.id),
      tenant: e.tenant,
    }));
  }

  @Post('events/:id/like')
  async toggleLike(
    @Param('id') id: string,
    @Body() body: { anonymousId: string },
  ) {
    const existing = await this.prisma.eventLike.findUnique({
      where: { eventId_anonymousId: { eventId: id, anonymousId: body.anonymousId } },
    });
    if (existing) {
      await this.prisma.eventLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.eventLike.create({ data: { eventId: id, anonymousId: body.anonymousId } });
    return { liked: true };
  }

  @Get('tenant-theme/:tenantId')
  async getTenantTheme(@Param('tenantId') tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { code: tenantId }], deletedAt: null },
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
        tenant: { deletedAt: null, code: { not: null } },
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
      .map((e) => ({ id: e.id, tenantCode: e.tenant.code!, updatedAt: e.updatedAt }));
  }

  @Get('events/:eventId')
  async getEventDetail(@Param('eventId') eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenant: { deletedAt: null },
      },
      include: {
        tenant: { select: { code: true, name: true, lineDisplayName: true, linePictureUrl: true, iconUrl: true } },
        reservations: {
          where: { status: { in: ['reserved', 'attended', 'waiting_payment'] } },
          select: { id: true },
        },
        reviews: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            member: { select: { lineDisplayName: true, linePictureUrl: true, name: true } },
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
      endAt: event.endAt,
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
      where: { deletedAt: null },
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
}
