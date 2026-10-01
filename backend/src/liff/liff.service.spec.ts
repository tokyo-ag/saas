import { LiffService } from './liff.service';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
      composeReservationConfirmMessage: jest
        .fn()
        .mockReturnValue('予約時の案内'),
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

describe('LiffService identity invariants', () => {
  const duplicateError = () =>
    new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });

  it('treats a concurrent second review as already submitted', async () => {
    const prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-id' }),
      },
      member: {
        findUnique: jest.fn().mockResolvedValue({ id: 'member-id' }),
      },
      tenantReview: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(duplicateError()),
      },
    };
    const service = new LiffService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.submitTenantReview('tenant-code', 'line-user-id', {
        content: 'とても楽しかったです',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.member.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_lineUserId: {
          tenantId: 'tenant-id',
          lineUserId: 'line-user-id',
        },
      },
    });
  });

  it('keeps the LINE identity when profile fields change and rejects a concurrent reservation', async () => {
    const member = {
      id: 'member-id',
      blockedAt: null,
      gender: '女性',
    };
    const prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-id' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'tenant-id',
          plan: 'standard',
          lineChannelAccessToken: 'token',
          requireName: true,
          requireGrade: true,
          requireGender: true,
        }),
      },
      event: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'event-id',
          title: '交流会',
          status: 'open',
          heldAt: new Date(Date.now() + 60_000),
          endAt: null,
          location: '池袋',
          locationUrl: null,
          capacity: 100,
          paymentRequired: false,
          price: 1_000,
          priceMale: null,
          priceFemale: null,
          levelEnabled: false,
          notifyOnReserve: false,
        }),
      },
      bannedLineUser: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      member: {
        findUnique: jest.fn().mockResolvedValue(member),
        upsert: jest.fn().mockResolvedValue(member),
      },
      reservation: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockRejectedValue(duplicateError()),
      },
    };
    const lineMessaging = {
      getLineProfile: jest.fn().mockResolvedValue(null),
    };
    const service = new LiffService(
      prisma as never,
      lineMessaging as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createReservation('tenant-code', 'line-user-id', {
        eventId: 'event-id',
        name: '変更後の名前',
        grade: '大学2年',
        gender: '女性',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.member.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_lineUserId: {
            tenantId: 'tenant-id',
            lineUserId: 'line-user-id',
          },
        },
        update: expect.objectContaining({ name: '変更後の名前' }),
      }),
    );
  });
});
