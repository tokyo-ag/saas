import { LiffService } from './liff.service';

describe('LiffService reservation message preview', () => {
  it('uses the reservation template instead of the scheduled reminder template', async () => {
    const heldAt = new Date('2026-10-30T09:00:00.000Z');
    const prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-id' }),
        findUnique: jest.fn().mockResolvedValue({
          reservationMessageTemplate: '団体の予約時テンプレート',
          reminderMessageTemplate: '団体の当日テンプレート',
        }),
      },
      event: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'event-id',
          title: '交流会',
          heldAt,
          endAt: null,
          location: '池袋',
          locationUrl: null,
          price: 1_000,
          priceMale: null,
          priceFemale: null,
          description: '予約時の説明',
          descriptionMale: null,
          descriptionFemale: null,
          maleDelayMinutes: null,
          reservationMessageTemplate: 'イベントの予約時テンプレート',
          reminderMessageTemplate: 'イベントの当日テンプレート',
        }),
      },
      member: {
        findUnique: jest.fn().mockResolvedValue({ gender: '女性' }),
      },
    };
    const lineMessaging = {
      composeReservationConfirmMessage: jest.fn().mockReturnValue('予約時の案内'),
    };
    const service = new LiffService(
      prisma as never,
      lineMessaging as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getReservationPreview('tenant-code', 'event-id', 'line-user-id'),
    ).resolves.toEqual({ text: '予約時の案内' });
    expect(lineMessaging.composeReservationConfirmMessage).toHaveBeenCalledWith(
      '交流会',
      heldAt,
      '池袋',
      1_000,
      '予約時の説明',
      'イベントの予約時テンプレート',
      expect.objectContaining({ gender: '女性' }),
    );
  });
});
