import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';
import { CreateEventDto } from './dto/create-event.dto';

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
        location: e.location,
        capacity: e.capacity,
        status: e.status,
        price: e.price,
        paymentRequired: e.paymentRequired,
        notifyOnReserve: e.notifyOnReserve,
        remindEnabled: e.remindEnabled,
        remindAt: e.remindAt,
        remindedAt: e.remindedAt,
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
    return this.prisma.event.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        heldAt: new Date(dto.heldAt),
        location: dto.location,
        capacity: dto.capacity ?? null,
        status: dto.status as any,
        price: dto.price,
        paymentRequired: dto.paymentRequired,
        notifyOnReserve: dto.notifyOnReserve,
        remindEnabled: dto.remindEnabled,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateEventDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.heldAt !== undefined && { heldAt: new Date(dto.heldAt) }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity ?? null }),
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.paymentRequired !== undefined && { paymentRequired: dto.paymentRequired }),
        ...(dto.notifyOnReserve !== undefined && { notifyOnReserve: dto.notifyOnReserve }),
        ...(dto.remindEnabled !== undefined && { remindEnabled: dto.remindEnabled }),
        ...(dto.remindAt !== undefined && {
          remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
        }),
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
      include: { member: true },
      orderBy: [{ status: 'asc' }, { reservedAt: 'asc' }],
    });
  }

  async sendRemind(tenantId: string, eventId: string) {
    const event = await this.findOne(tenantId, eventId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.lineChannelAccessToken) return { sentCount: 0 };

    const reservations = await this.prisma.reservation.findMany({
      where: { eventId, status: { in: ['reserved', 'attended'] } },
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
