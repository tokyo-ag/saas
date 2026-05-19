import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';
import { CreateEventDto } from './dto/create-event.dto';
import { PLAN_LIMITS } from '../config/plan-limits';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  async findAll(tenantId: string) {
    const events = await this.prisma.event.findMany({
      where: { tenantId },
      include: {
        reservations: {
          where: { status: { in: ['reserved', 'attended', 'waiting_payment'] } },
          select: { id: true, status: true },
        },
      },
      orderBy: { heldAt: 'desc' },
    });

    return events.map((e) => ({
      ...e,
      reservedCount: e.reservations.filter((r) =>
        ['reserved', 'attended', 'waiting_payment'].includes(r.status),
      ).length,
      waitlistedCount: 0,
      reservations: undefined,
    }));
  }

  async findAllWithCounts(tenantId: string) {
    const events = await this.prisma.event.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            reservations: true,
          },
        },
        reservations: {
          where: { status: { notIn: ['cancelled'] } },
          select: { status: true },
        },
      },
      orderBy: { heldAt: 'desc' },
    });

    return events.map((e) => {
      const reserved = e.reservations.filter((r) =>
        ['reserved', 'attended', 'waiting_payment'].includes(r.status),
      ).length;
      const waitlisted = e.reservations.filter((r) => r.status === 'waitlisted').length;
      return {
        id: e.id,
        tenantId: e.tenantId,
        title: e.title,
        description: e.description,
        heldAt: e.heldAt,
        endAt: e.endAt,
        location: e.location,
        capacity: e.capacity,
        status: e.status,
        price: e.price,
        paymentRequired: e.paymentRequired,
        notifyOnReserve: e.notifyOnReserve,
        remindEnabled: e.remindEnabled,
        remindAt: e.remindAt,
        remindedAt: e.remindedAt,
        imageUrl: e.imageUrl,
        iconUrl: e.iconUrl,
        category: e.category,
        tags: e.tags,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        reservedCount: reserved,
        waitlistedCount: waitlisted,
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId },
    });
    if (!event) throw new NotFoundException('Event not found');
    const reserved = await this.prisma.reservation.count({
      where: { eventId: id, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
    });
    const waitlisted = await this.prisma.reservation.count({
      where: { eventId: id, status: 'waitlisted' },
    });
    return { ...event, reservedCount: reserved, waitlistedCount: waitlisted };
  }

  async create(tenantId: string, dto: CreateEventDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.plan === 'free') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const count = await this.prisma.event.count({
        where: { tenantId, createdAt: { gte: monthStart } },
      });
      if (count >= PLAN_LIMITS.free.eventsPerMonth) {
        throw new ForbiddenException(`今月のイベント作成上限（${PLAN_LIMITS.free.eventsPerMonth}件）に達しました。スタンダードプランにアップグレードしてください。`);
      }
      if (dto.remindEnabled) {
        throw new ForbiddenException('リマインド機能はスタンダードプランでご利用いただけます。');
      }
    }
    return this.prisma.event.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        heldAt: new Date(dto.heldAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        location: dto.location,
        locationUrl: dto.locationUrl ?? null,
        capacity: dto.capacity ?? null,
        capacityMale: dto.capacityMale ?? null,
        capacityFemale: dto.capacityFemale ?? null,
        status: dto.status as EventStatus,
        price: dto.price,
        priceMale: dto.priceMale ?? null,
        priceFemale: dto.priceFemale ?? null,
        paymentRequired: dto.paymentTiming === 'prepay',
        paymentTiming: dto.paymentTiming ?? 'onsite',
        notifyOnReserve: dto.notifyOnReserve,
        notifyOnReserveApp: dto.notifyOnReserveApp ?? false,
        remindEnabled: dto.remindEnabled,
        remindApp: dto.remindApp ?? false,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
        imageUrl: dto.imageUrl ?? null,
        iconUrl: dto.iconUrl ?? null,
        category: dto.category ?? null,
        tags: dto.tags ?? [],
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateEventDto>) {
    await this.findOne(tenantId, id);
    if (dto.remindEnabled) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.plan === 'free') {
        throw new ForbiddenException('リマインド機能はスタンダードプランでご利用いただけます。');
      }
    }
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.heldAt !== undefined && { heldAt: new Date(dto.heldAt) }),
        ...(dto.endAt !== undefined && { endAt: dto.endAt ? new Date(dto.endAt) : null }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity ?? null }),
        ...(dto.status !== undefined && { status: dto.status as EventStatus }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.paymentRequired !== undefined && { paymentRequired: dto.paymentRequired }),
        ...(dto.locationUrl !== undefined && { locationUrl: dto.locationUrl ?? null }),
        ...(dto.capacityMale !== undefined && { capacityMale: dto.capacityMale ?? null }),
        ...(dto.capacityFemale !== undefined && { capacityFemale: dto.capacityFemale ?? null }),
        ...(dto.priceMale !== undefined && { priceMale: dto.priceMale ?? null }),
        ...(dto.priceFemale !== undefined && { priceFemale: dto.priceFemale ?? null }),
        ...(dto.paymentTiming !== undefined && { paymentTiming: dto.paymentTiming, paymentRequired: dto.paymentTiming === 'prepay' }),
        ...(dto.notifyOnReserve !== undefined && { notifyOnReserve: dto.notifyOnReserve }),
        ...(dto.notifyOnReserveApp !== undefined && { notifyOnReserveApp: dto.notifyOnReserveApp }),
        ...(dto.remindEnabled !== undefined && { remindEnabled: dto.remindEnabled }),
        ...(dto.remindApp !== undefined && { remindApp: dto.remindApp }),
        ...(dto.remindAt !== undefined && {
          remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
        }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl || null }),
        ...(dto.category !== undefined && { category: dto.category ?? null }),
        ...(dto.tags !== undefined && { tags: dto.tags ?? [] }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.reservation.deleteMany({ where: { eventId: id } });
    return this.prisma.event.delete({ where: { id } });
  }

  async getReservations(tenantId: string, eventId: string) {
    await this.findOne(tenantId, eventId);
    return this.prisma.reservation.findMany({
      where: { eventId, tenantId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            grade: true,
            gender: true,
            lineUserId: true,
            lineDisplayName: true,
            linePictureUrl: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { reservedAt: 'asc' }],
    });
  }

  async getReviews(tenantId: string, eventId: string) {
    await this.findOne(tenantId, eventId);
    return this.prisma.eventReview.findMany({
      where: { tenantId, eventId },
      include: { member: { select: { id: true, name: true, grade: true, gender: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReview(tenantId: string, eventId: string, reviewId: string, isPublished: boolean) {
    const review = await this.prisma.eventReview.findFirst({
      where: { id: reviewId, tenantId, eventId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.eventReview.update({
      where: { id: reviewId },
      data: { isPublished },
    });
  }

  async checkin(tenantId: string, eventId: string, memberId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { tenantId, eventId, memberId },
      include: { member: true },
    });
    if (!reservation) throw new NotFoundException('予約が見つかりません');
    if (reservation.status === ReservationStatus.attended) {
      return { alreadyCheckedIn: true, memberName: reservation.member.name ?? '不明' };
    }
    if (reservation.status !== ReservationStatus.reserved && reservation.status !== ReservationStatus.waiting_payment) {
      throw new NotFoundException('有効な予約が見つかりません');
    }
    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.attended },
    });
    return { alreadyCheckedIn: false, memberName: reservation.member.name ?? '不明' };
  }

  async sendMessage(
    tenantId: string,
    eventId: string,
    content: string,
    sendLine: boolean,
    sendApp: boolean,
  ) {
    const event = await this.findOne(tenantId, eventId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    const reservations = await this.prisma.reservation.findMany({
      where: { eventId, tenantId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
      include: { member: true },
    });

    let lineSentCount = 0;
    let appSentCount = 0;

    for (const r of reservations) {
      if (sendLine && tenant?.lineChannelAccessToken) {
        await this.lineMessaging.sendPushMessage(
          tenant.lineChannelAccessToken,
          r.member.lineUserId,
          `【${event.title}】\n${content}`,
        );
        lineSentCount++;
      }
      if (sendApp) {
        await this.prisma.notification.create({
          data: { tenantId, memberId: r.memberId, title: event.title, body: content },
        });
        appSentCount++;
      }
    }

    return { lineSentCount, appSentCount, total: reservations.length };
  }

  async sendRemind(tenantId: string, eventId: string) {
    const event = await this.findOne(tenantId, eventId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.lineChannelAccessToken) return { sentCount: 0 };

    const reservations = await this.prisma.reservation.findMany({
      where: { eventId, tenantId, status: { in: ['reserved', 'attended'] } },
      include: { member: true },
    });

    for (const r of reservations) {
      await this.lineMessaging.sendRemind(
        tenant.lineChannelAccessToken,
        r.member.lineUserId,
        event.title,
        event.heldAt,
        event.location,
      );
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: { remindedAt: new Date() },
    });

    return { sentCount: reservations.length };
  }

  async exportCsv(tenantId: string, eventId: string): Promise<string> {
    const event = await this.findOne(tenantId, eventId);
    const reservations = await this.prisma.reservation.findMany({
      where: { eventId, tenantId },
      include: { member: true },
      orderBy: { reservedAt: 'asc' },
    });

    const header = '名前,学年,性別,予約日時,ステータス,支払い状況';
    const rows = reservations.map((r) => {
      const statusLabel = this.statusLabel(r.status, r.waitlistOrder);
      const paymentLabel = r.paidAt ? '支払済' : event.price === 0 ? '無料' : '未払い';
      const date = new Date(r.reservedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      return `${r.member.name ?? ''},${r.member.grade ?? ''},${r.member.gender ?? ''},${date},${statusLabel},${paymentLabel}`;
    });

    return [header, ...rows].join('\n');
  }

  private statusLabel(status: string, waitlistOrder: number | null): string {
    const map: Record<string, string> = {
      reserved: '参加確定',
      attended: '参加済',
      cancelled: 'キャンセル',
      waiting_payment: '支払待ち',
      waitlisted: `キャンセル待ち${waitlistOrder ?? ''}番`,
    };
    return map[status] ?? status;
  }
}
