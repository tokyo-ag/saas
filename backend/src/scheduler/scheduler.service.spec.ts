import { SchedulerService } from './scheduler.service';
import { ReservationStatus } from '@prisma/client';

describe('SchedulerService.releaseAbandonedPayments', () => {
  it('cancels only waiting_payment reservations older than the abandonment threshold', async () => {
    const prisma = {
      reservation: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };
    const service = new SchedulerService(prisma as never, {} as never);

    await service.releaseAbandonedPayments();

    expect(prisma.reservation.updateMany).toHaveBeenCalledTimes(1);
    const call = prisma.reservation.updateMany.mock.calls[0][0];
    expect(call.where.status).toBe(ReservationStatus.waiting_payment);
    expect(call.data).toEqual({ status: ReservationStatus.cancelled });

    const cutoff = call.where.reservedAt.lt as Date;
    const hoursAgo = (Date.now() - cutoff.getTime()) / (60 * 60 * 1000);
    // しきい値はStripeチェックアウトセッションの既定の失効時間（24時間）より
    // 確実に後になっている必要がある（支払済み予約を誤ってキャンセルしないため）。
    expect(hoursAgo).toBeGreaterThan(24);
    expect(hoursAgo).toBeLessThan(26);
  });

  it('does not log when there is nothing to release', async () => {
    const prisma = {
      reservation: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const service = new SchedulerService(prisma as never, {} as never);
    const logSpy = jest.spyOn(service['logger'], 'log');

    await service.releaseAbandonedPayments();

    expect(logSpy).not.toHaveBeenCalled();
  });
});
