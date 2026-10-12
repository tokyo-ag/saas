import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';
import {
  BELL_GENDER_RATIO_MIN_PARTICIPANTS,
  bellGenderRatioReservationBlocked,
} from '../event-social-proof/event-social-proof.service';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private lineMessaging: LineMessagingService,
  ) {}

  async updateStatus(tenantId: string, id: string, status: ReservationStatus) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
      include: { member: true, event: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.status === status) return reservation;

    if (
      reservation.status === ReservationStatus.pending_approval &&
      status !== ReservationStatus.reserved &&
      status !== ReservationStatus.cancelled
    ) {
      throw new BadRequestException(
        '承認待ちの申込は、承認またはキャンセルのみ操作できます。',
      );
    }

    if (
      reservation.status === ReservationStatus.pending_approval &&
      status === ReservationStatus.reserved
    ) {
      await this.assertApprovalCapacity(reservation);
    }

    const updated = await this.prisma.reservation
      .update({
        where: { id },
        data: { status },
        include: { member: true, event: true },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'この参加者には同じイベントの有効な予約がすでにあります',
          );
        }
        if (error instanceof HttpException) throw error;
        throw new ConflictException('予約の更新に失敗しました');
      });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (
      reservation.status === ReservationStatus.pending_approval &&
      status === ReservationStatus.reserved
    ) {
      await this.lineMessaging.sendReservationConfirm(
        tenant?.lineChannelAccessToken ?? '',
        reservation.member.lineUserId,
        reservation.event.title,
        reservation.event.heldAt,
        reservation.event.location,
        reservation.event.price,
        reservation.event.description,
        reservation.event.reservationMessageTemplate ??
          tenant?.reservationMessageTemplate,
        {
          endAt: reservation.event.endAt,
          locationUrl: reservation.event.locationUrl,
          priceMale: reservation.event.priceMale,
          priceFemale: reservation.event.priceFemale,
          descriptionMale: reservation.event.descriptionMale,
          descriptionFemale: reservation.event.descriptionFemale,
          maleDelayMinutes: reservation.event.maleDelayMinutes,
          gender: reservation.member.gender,
        },
      );
    } else if (
      reservation.status === ReservationStatus.pending_approval &&
      status === ReservationStatus.cancelled
    ) {
      await this.lineMessaging.sendReservationCancelled(
        tenant?.lineChannelAccessToken ?? '',
        reservation.member.lineUserId,
        reservation.event.title,
      );
    } else if (status === ReservationStatus.cancelled) {
      await this.lineMessaging.sendCancelNotifyToOrganizer(
        tenant?.lineChannelAccessToken ?? '',
        tenant?.organizerLineUserId ?? '',
        reservation.member.name ?? '参加者',
        reservation.event.title,
      );
    }

    return updated;
  }

  private async assertApprovalCapacity(reservation: {
    eventId: string;
    member: { gender: string | null };
    event: {
      capacity: number | null;
      capacityMale: number | null;
      capacityFemale: number | null;
      bellGenderRatioAuto: boolean;
    };
  }) {
    const acceptedStatuses: ReservationStatus[] = [
      ReservationStatus.reserved,
      ReservationStatus.attended,
      ReservationStatus.waiting_payment,
    ];
    const acceptedCount = await this.prisma.reservation.count({
      where: { eventId: reservation.eventId, status: { in: acceptedStatuses } },
    });
    if (
      reservation.event.bellGenderRatioAuto &&
      acceptedCount + 1 >= BELL_GENDER_RATIO_MIN_PARTICIPANTS
    ) {
      if (
        reservation.member.gender !== '男性' &&
        reservation.member.gender !== '女性'
      ) {
        throw new BadRequestException('承認には参加者の性別設定が必要です。');
      }
      const [male, female] = await Promise.all([
        this.prisma.reservation.count({
          where: {
            eventId: reservation.eventId,
            status: { in: acceptedStatuses },
            member: { gender: '男性' },
          },
        }),
        this.prisma.reservation.count({
          where: {
            eventId: reservation.eventId,
            status: { in: acceptedStatuses },
            member: { gender: '女性' },
          },
        }),
      ]);
      if (
        bellGenderRatioReservationBlocked(
          male,
          female,
          reservation.member.gender,
        )
      ) {
        throw new BadRequestException(
          '現在の男女比では、この男性参加者を承認できません。',
        );
      }
      return;
    }

    const hasGenderCapacity =
      reservation.event.capacityMale !== null ||
      reservation.event.capacityFemale !== null;
    if (
      hasGenderCapacity &&
      (reservation.member.gender === '男性' ||
        reservation.member.gender === '女性')
    ) {
      const cap =
        reservation.member.gender === '男性'
          ? reservation.event.capacityMale
          : reservation.event.capacityFemale;
      if (cap !== null) {
        const genderCount = await this.prisma.reservation.count({
          where: {
            eventId: reservation.eventId,
            status: { in: acceptedStatuses },
            member: { gender: reservation.member.gender },
          },
        });
        if (genderCount >= cap) {
          throw new BadRequestException('この性別の定員に達しています。');
        }
      }
    } else if (
      reservation.event.capacity !== null &&
      acceptedCount >= reservation.event.capacity
    ) {
      throw new BadRequestException('定員に達しています。');
    }
  }
}
