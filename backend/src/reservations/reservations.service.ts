import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

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
      await this.promoteWaitlist(reservation.eventId);
    }

    return updated;
  }

  async promoteWaitlist(eventId: string) {
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
  }
}
