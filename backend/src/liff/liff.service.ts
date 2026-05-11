import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';

export class CreateReservationDto {
  @IsString() eventId!: string;
  @IsString() lineUserId!: string;
  @IsString() name!: string;
  @IsString() grade!: string;
  @IsString() gender!: string;
}

@Injectable()
export class LiffService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  // イベント一覧（status=open のものだけ）
  async getEvents(tenantId: string) {
    const events = await this.prisma.event.findMany({
      where: { tenantId, status: 'open' },
      include: {
        reservations: {
          where: { status: { in: ['reserved', 'attended', 'waiting_payment'] } },
          select: { id: true },
        },
      },
      orderBy: { heldAt: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      heldAt: e.heldAt,
      location: e.location,
      capacity: e.capacity,
      status: e.status,
      price: e.price,
      paymentRequired: e.paymentRequired,
      reservedCount: e.reservations.length,
    }));
  }

  // イベント詳細1件
  async getEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const reservedCount = await this.prisma.reservation.count({
      where: { eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
    });

    return { ...event, reservedCount };
  }

  // 予約登録（重複チェック・キャンセル待ち・LINE通知込み）
  async createReservation(tenantId: string, dto: CreateReservationDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, tenantId, status: 'open' },
    });
    if (!event) throw new NotFoundException('Event not found or not open');

    // 参加者を登録 or 情報更新（LINEユーザーIDで一意に管理）
    let member = await this.prisma.member.findUnique({
      where: { tenantId_lineUserId: { tenantId, lineUserId: dto.lineUserId } },
    });
    if (!member) {
      member = await this.prisma.member.create({
        data: { tenantId, lineUserId: dto.lineUserId, name: dto.name, grade: dto.grade, gender: dto.gender },
      });
    } else {
      member = await this.prisma.member.update({
        where: { id: member.id },
        data: { name: dto.name, grade: dto.grade, gender: dto.gender },
      });
    }

    // 同じイベントへの予約は2回まで（キャンセル済みを除く）
    const existingCount = await this.prisma.reservation.count({
      where: { memberId: member.id, eventId: dto.eventId, status: { not: 'cancelled' } },
    });
    if (existingCount >= 2) {
      throw new ConflictException('このイベントへの予約上限（2回）に達しています');
    }

    // 定員チェック
    const reservedCount = await this.prisma.reservation.count({
      where: { eventId: dto.eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
    });
    const isFull = event.capacity !== null && reservedCount >= event.capacity;

    // 前払い必須のイベントは満席なら予約不可
    if (isFull && event.paymentRequired) {
      throw new BadRequestException('満席のため予約できません');
    }

    const status: 'reserved' | 'waitlisted' = isFull ? 'waitlisted' : 'reserved';
    let waitlistOrder: number | null = null;

    if (status === 'waitlisted') {
      const maxOrder = await this.prisma.reservation.aggregate({
        where: { eventId: dto.eventId, status: 'waitlisted' },
        _max: { waitlistOrder: true },
      });
      waitlistOrder = (maxOrder._max.waitlistOrder ?? 0) + 1;
    }

    const reservation = await this.prisma.reservation.create({
      data: { tenantId, eventId: dto.eventId, memberId: member.id, status, waitlistOrder },
    });

    // LINE通知（notifyOnReserve=true のときだけ）
    if (event.notifyOnReserve) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.lineChannelAccessToken) {
        if (status === 'reserved') {
          await this.lineMessaging.sendReservationConfirm(
            tenant.lineChannelAccessToken, dto.lineUserId,
            event.title, event.heldAt, event.location,
          );
        } else {
          await this.lineMessaging.sendWaitlistRegistered(
            tenant.lineChannelAccessToken, dto.lineUserId,
            event.title, waitlistOrder!,
          );
        }
      }
    }

    return { id: reservation.id, status, waitlistOrder };
  }

  // キャンセル（キャンセル待ちの自動繰り上げ込み）
  async cancelReservation(tenantId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      include: { event: true, member: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'cancelled' },
    });

    // 定員がある場合のみ繰り上げ処理
    if (reservation.event.capacity !== null) {
      const activeCount = await this.prisma.reservation.count({
        where: { eventId: reservation.eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
      });

      if (activeCount < reservation.event.capacity) {
        const next = await this.prisma.reservation.findFirst({
          where: { eventId: reservation.eventId, status: 'waitlisted' },
          orderBy: { waitlistOrder: 'asc' },
          include: { member: true },
        });

        if (next) {
          await this.prisma.reservation.update({
            where: { id: next.id },
            data: { status: 'reserved', waitlistOrder: null },
          });

          const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
          if (tenant?.lineChannelAccessToken) {
            await this.lineMessaging.sendWaitlistPromoted(
              tenant.lineChannelAccessToken, next.member.lineUserId,
              reservation.event.title, reservation.event.heldAt, reservation.event.location,
            );
          }
        }
      }
    }

    return { message: 'キャンセルしました' };
  }
}
