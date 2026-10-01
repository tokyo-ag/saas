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
});
