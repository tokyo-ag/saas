import { ConflictException } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';

describe('ReservationsService identity invariants', () => {
  it('does not reactivate a cancelled duplicate when an active reservation exists', async () => {
    const prisma = {
      reservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'reservation-old',
          tenantId: 'tenant-1',
          eventId: 'event-1',
          memberId: 'member-1',
          status: ReservationStatus.cancelled,
          member: { id: 'member-1' },
          event: { id: 'event-1' },
        }),
        update: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        ),
      },
    };
    const service = new ReservationsService(prisma as never, {} as never);

    await expect(
      service.updateStatus(
        'tenant-1',
        'reservation-old',
        ReservationStatus.reserved,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('does not auto-promote a waitlisted reservation after a cancellation', async () => {
    const prisma = {
      reservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'reservation-1',
          tenantId: 'tenant-1',
          eventId: 'event-1',
          memberId: 'member-1',
          status: ReservationStatus.reserved,
          member: { id: 'member-1', name: '田中' },
          event: { id: 'event-1', title: '交流会' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'reservation-1',
          status: ReservationStatus.cancelled,
        }),
        count: jest.fn(),
      },
      event: { findUnique: jest.fn() },
      tenant: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const lineMessaging = {
      sendWaitlistPromoted: jest.fn(),
      sendCancelNotifyToOrganizer: jest.fn(),
    };
    const service = new ReservationsService(
      prisma as never,
      lineMessaging as never,
    );

    await expect(
      service.updateStatus(
        'tenant-1',
        'reservation-1',
        ReservationStatus.cancelled,
      ),
    ).resolves.toEqual({
      id: 'reservation-1',
      status: ReservationStatus.cancelled,
    });
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
    expect(prisma.reservation.count).not.toHaveBeenCalled();
    expect(lineMessaging.sendWaitlistPromoted).not.toHaveBeenCalled();
  });
});
