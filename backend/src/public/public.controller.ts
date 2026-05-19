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
          select: { id: true, name: true, lineDisplayName: true, linePictureUrl: true },
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
        status: 'open',
        tenant: { deletedAt: null },
      },
      include: {
        tenant: { select: { code: true, name: true, lineDisplayName: true, linePictureUrl: true } },
        reservations: {
          where: { status: { in: ['reserved', 'attended', 'waiting_payment'] } },
          select: { id: true },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
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
      tenantIconUrl: event.tenant.linePictureUrl,
    };
  }

  @Get('tenants')
  async getTenants() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { members: true, events: true } },
        events: {
          select: {
            _count: { select: { likes: true } },
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
        linePictureUrl: t.linePictureUrl,
        memberCount: t._count.members,
        eventCount: t._count.events,
        totalLikes: t.events.reduce((sum, e) => sum + e._count.likes, 0),
      }))
      .sort((a, b) => b.totalLikes - a.totalLikes);

    return ranked.slice(0, 10);
  }
}
