import { LiffService } from './liff.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';

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
          capacityMale: null,
          capacityFemale: null,
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
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockRejectedValue(duplicateError()),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    });
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

  it('treats a concurrent double-submit of the same reservation as a success, not an error', async () => {
    const member = {
      id: 'member-id',
      blockedAt: null,
      gender: '女性',
    };
    const winningReservation = {
      id: 'reservation-id',
      status: ReservationStatus.reserved,
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
          capacityMale: null,
          capacityFemale: null,
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
        // 1回目（トランザクション内の事前チェック）はnull、2回目（P2002後の再取得）は
        // もう片方のリクエストが先に作った予約を返す、という競合シナリオを再現する。
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(winningReservation),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockRejectedValue(duplicateError()),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    });
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
        name: '名前',
        grade: '大学2年',
        gender: '女性',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'reservation-id',
        status: 'reserved',
        alreadyReserved: true,
      }),
    );
  });

  it('returns the existing reservation details instead of an error on a plain repeat submission', async () => {
    const member = {
      id: 'member-id',
      blockedAt: null,
      gender: '女性',
    };
    const existingReservation = {
      id: 'existing-reservation-id',
      status: ReservationStatus.reserved,
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
          capacityMale: null,
          capacityFemale: null,
          paymentRequired: false,
          price: 1_000,
          priceMale: null,
          priceFemale: null,
          levelEnabled: false,
          notifyOnReserve: true,
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
        findFirst: jest.fn().mockResolvedValue(existingReservation),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    });
    const lineMessaging = {
      getLineProfile: jest.fn().mockResolvedValue(null),
      sendReservationConfirm: jest.fn(),
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
        name: '名前',
        grade: '大学2年',
        gender: '女性',
      }),
    ).resolves.toEqual({
      id: 'existing-reservation-id',
      status: ReservationStatus.reserved,
      waitlistOrder: null,
      alreadyReserved: true,
    });
    // 既に申し込み済みの場合は、新規予約の通知も予約の作成・更新も行わない。
    expect(prisma.reservation.create).not.toHaveBeenCalled();
    expect(prisma.reservation.update).not.toHaveBeenCalled();
    expect(lineMessaging.sendReservationConfirm).not.toHaveBeenCalled();
  });

  it('rejects a male reservation when the male capacity is full without creating a waitlist entry', async () => {
    const member = {
      id: 'member-id',
      blockedAt: null,
      gender: '男性',
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
          capacity: 100,
          capacityMale: 1,
          capacityFemale: 99,
          paymentRequired: false,
          price: 1_000,
          priceMale: null,
          priceFemale: null,
          levelEnabled: false,
          notifyOnReserve: true,
        }),
      },
      bannedLineUser: { findUnique: jest.fn().mockResolvedValue(null) },
      member: {
        findUnique: jest.fn().mockResolvedValue(member),
        upsert: jest.fn().mockResolvedValue(member),
      },
      reservation: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    });
    const lineMessaging = {
      getLineProfile: jest.fn().mockResolvedValue(null),
      sendReservationConfirm: jest.fn(),
      sendWaitlistRegistered: jest.fn(),
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
        name: '田中',
        grade: '大学2年',
        gender: '男性',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reservation.create).not.toHaveBeenCalled();
    expect(lineMessaging.sendReservationConfirm).not.toHaveBeenCalled();
    expect(lineMessaging.sendWaitlistRegistered).not.toHaveBeenCalled();
  });

  it('lets an existing legacy waitlisted user claim a newly opened slot', async () => {
    const member = {
      id: 'member-id',
      blockedAt: null,
      gender: '男性',
    };
    const updatedReservation = {
      id: 'waitlisted-reservation',
      status: ReservationStatus.reserved,
      waitlistOrder: null,
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
          capacity: 100,
          capacityMale: 1,
          capacityFemale: 99,
          paymentRequired: false,
          price: 1_000,
          priceMale: null,
          priceFemale: null,
          levelEnabled: false,
          notifyOnReserve: false,
        }),
      },
      bannedLineUser: { findUnique: jest.fn().mockResolvedValue(null) },
      member: {
        findUnique: jest.fn().mockResolvedValue(member),
        upsert: jest.fn().mockResolvedValue(member),
      },
      reservation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'waitlisted-reservation',
          status: ReservationStatus.waitlisted,
        }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(updatedReservation),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    });
    const service = new LiffService(
      prisma as never,
      { getLineProfile: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createReservation('tenant-code', 'line-user-id', {
        eventId: 'event-id',
        name: '田中',
        grade: '大学2年',
        gender: '男性',
      }),
    ).resolves.toEqual({
      id: 'waitlisted-reservation',
      status: ReservationStatus.reserved,
      waitlistOrder: null,
      stripeCheckoutUrl: undefined,
      alreadyReserved: false,
    });
    expect(prisma.reservation.update).toHaveBeenCalledWith({
      where: { id: 'waitlisted-reservation' },
      data: expect.objectContaining({
        status: ReservationStatus.reserved,
        waitlistOrder: null,
      }),
    });
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });
});
