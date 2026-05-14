import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
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

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status },
      include: { member: true, event: true },
    });

    if (status === ReservationStatus.cancelled) {
      await this.promoteWaitlist(tenantId, reservation.eventId);

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.lineChannelAccessToken) {
        await this.lineMessaging.sendCancelNotifyToOrganizer(
          tenant.lineChannelAccessToken,
          '',
          reservation.member.name ?? '参加者',
          reservation.event.title,
        );
      }
    }

    return updated;
  }

  async promoteWaitlist(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return;

    if (event.capacity === null) return;

    const activeCount = await this.prisma.reservation.count({
      where: { eventId, status: { in: ['reserved', 'attended', 'waiting_payment'] } },
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

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
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
