import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line-messaging/line-messaging.service';

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
        throw error;
      });

    if (status === ReservationStatus.cancelled) {
      await this.promoteWaitlist(tenantId, reservation.eventId);

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenant?.lineChannelAccessToken) {
        await this.lineMessaging.sendCancelNotifyToOrganizer(
          tenant.lineChannelAccessToken,
          tenant.organizerLineUserId ?? '',
          reservation.member.name ?? '参加者',
          reservation.event.title,
        );
      }
    }

    return updated;
  }

  async promoteWaitlist(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) return;

    if (event.capacity === null) return;

    const activeCount = await this.prisma.reservation.count({
      where: {
        eventId,
        status: { in: ['reserved', 'attended', 'waiting_payment'] },
      },
    });

    if (activeCount >= event.capacity) return;

    const nextWaitlisted = await this.prisma.reservation.findFirst({
      where: { eventId, status: 'waitlisted' },
      orderBy: { waitlistOrder: 'asc' },
      include: { member: true },
    });

    if (!nextWaitlisted) return;

    await this.prisma.reservation.update({
      where: { id: nextWaitlisted.id },
      data: { status: ReservationStatus.reserved, waitlistOrder: null },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (tenant?.lineChannelAccessToken && nextWaitlisted.member.lineUserId) {
      await this.lineMessaging.sendWaitlistPromoted(
        tenant.lineChannelAccessToken,
        nextWaitlisted.member.lineUserId,
        event.title,
        event.heldAt,
        event.location,
      );
    }
  }
}
