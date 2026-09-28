import { BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, EventStatusDto } from './dto/create-event.dto';

function eventDto(overrides: Partial<CreateEventDto> = {}): CreateEventDto {
  return {
    title: '20代交流会',
    description: '東京で開催する20代向け交流会です。',
    heldAt: '2026-06-12T11:00:00.000Z',
    endAt: '2026-06-12T13:00:00.000Z',
    location: '池袋',
    locationUrl: undefined,
    capacity: null,
    capacityMale: null,
    capacityFemale: null,
    status: EventStatusDto.open,
    price: 0,
    priceMale: null,
    priceFemale: null,
    paymentRequired: false,
    paymentTiming: 'onsite',
    notifyOnReserve: true,
    remindEnabled: false,
    remindAt: null,
    imageUrl: undefined,
    iconUrl: undefined,
    category: 'meetup',
    tags: ['交流会'],
    ...overrides,
  };
}

describe('EventsService date validation', () => {
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', plan: 'pro' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    event: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      findFirst: jest.fn(),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    reservation: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    collabEventLink: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    supportMessage: {
      create: jest.fn().mockResolvedValue({ id: 'support-message-1' }),
    },
  };
  const lineMessaging = {
    sendRemind: jest.fn().mockResolvedValue(undefined),
  };

  const service = new EventsService(prisma as never, lineMessaging as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', plan: 'pro' });
    prisma.event.count.mockResolvedValue(0);
    prisma.event.findFirst.mockResolvedValue({
      id: 'event-1',
      tenantId: 'tenant-1',
      title: '20代交流会',
      heldAt: new Date('2026-06-12T11:00:00.000Z'),
      endAt: new Date('2026-06-12T13:00:00.000Z'),
      remindAt: null,
    });
    prisma.reservation.count.mockResolvedValue(0);
    prisma.collabEventLink.findUnique.mockResolvedValue(null);
    prisma.tenant.findMany.mockResolvedValue([]);
    prisma.supportMessage.create.mockResolvedValue({
      id: 'support-message-1',
    });
  });

  it('rejects an event whose end time is not after its start time', async () => {
    await expect(
      service.create(
        'tenant-1',
        eventDto({ endAt: '2026-06-12T10:59:00.000Z' }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('rejects a reminder time that is not before the event start time', async () => {
    await expect(
      service.create(
        'tenant-1',
        eventDto({
          remindEnabled: true,
          remindAt: '2026-06-12T11:00:00.000Z',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('normalizes valid event dates before saving', async () => {
    await service.create('tenant-1', eventDto());

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          heldAt: new Date('2026-06-12T11:00:00.000Z'),
          endAt: new Date('2026-06-12T13:00:00.000Z'),
        }),
      }),
    );
  });

  it('saves every selected category while keeping the first as the legacy category', async () => {
    await service.create(
      'tenant-1',
      eventDto({
        category: 'badminton',
        categories: ['badminton', 'basketball'],
      }),
    );

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'badminton',
          categories: ['badminton', 'basketball'],
        }),
      }),
    );
  });

  it('keeps legacy single-category clients compatible', async () => {
    await service.create('tenant-1', eventDto({ category: 'meetup' }));

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'meetup',
          categories: ['meetup'],
        }),
      }),
    );
  });

  it('updates all selected categories from the event edit form', async () => {
    await service.update('tenant-1', 'event-1', {
      category: 'badminton',
      categories: ['badminton', 'basketball'],
    });

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          category: 'badminton',
          categories: ['badminton', 'basketball'],
        }),
      }),
    );
  });

  it('clears existing event images when null is sent', async () => {
    await service.update('tenant-1', 'event-1', {
      imageUrl: null,
      iconUrl: null,
    });

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          imageUrl: null,
          iconUrl: null,
        }),
      }),
    );
  });

  it('includes up to four selected organizations in a collaboration request', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      name: 'Source Club',
      code: 'source-club',
    });
    prisma.tenant.findMany.mockResolvedValue([
      {
        id: 'tenant-2',
        name: 'Club Two',
        lineDisplayName: null,
        code: 'club-two',
      },
      {
        id: 'tenant-3',
        name: 'Club Three',
        lineDisplayName: 'クラブ3公式',
        code: 'club-three',
      },
      {
        id: 'tenant-4',
        name: 'Club Four',
        lineDisplayName: null,
        code: 'club-four',
      },
      {
        id: 'tenant-5',
        name: 'Club Five',
        lineDisplayName: null,
        code: 'club-five',
      },
    ]);

    await service.requestCollab('tenant-1', 'event-1', [
      'tenant-2',
      'tenant-3',
      'tenant-4',
      'tenant-5',
    ]);

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['tenant-2', 'tenant-3', 'tenant-4', 'tenant-5'] },
        deletedAt: null,
        bannedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
    expect(prisma.supportMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: expect.stringContaining('1. Club Two（コード: club-two）'),
      }),
    });
    expect(prisma.supportMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: expect.stringContaining('2. Club Three（コード: club-three）'),
      }),
    });
    expect(prisma.supportMessage.create).toHaveBeenCalledTimes(5);
    expect(prisma.supportMessage.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-2',
        lineUserId: 'tenant:tenant-2',
        content: expect.stringContaining(
          'Source Clubからコラボ申請が届きました。',
        ),
        fromUser: false,
      },
    });
    expect(prisma.supportMessage.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-5',
        lineUserId: 'tenant:tenant-5',
        content: expect.stringContaining(
          '参加予定団体: Source Club、Club Two、Club Three、Club Four、Club Five',
        ),
        fromUser: false,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects collaboration requests for more than four organizations', async () => {
    await expect(
      service.requestCollab('tenant-1', 'event-1', [
        'tenant-2',
        'tenant-3',
        'tenant-4',
        'tenant-5',
        'tenant-6',
      ]),
    ).rejects.toThrow('コラボしたい団体は4団体まで選択できます');

    expect(prisma.tenant.findMany).not.toHaveBeenCalled();
    expect(prisma.supportMessage.create).not.toHaveBeenCalled();
  });

  it('uses the event reminder template when sending a reminder manually', async () => {
    const eventTemplate = '【{title}】イベント固有のリマインドです';
    prisma.event.findFirst.mockResolvedValue({
      id: 'event-1',
      tenantId: 'tenant-1',
      title: '20代交流会',
      heldAt: new Date('2026-06-12T11:00:00.000Z'),
      endAt: new Date('2026-06-12T13:00:00.000Z'),
      remindAt: new Date('2026-06-11T09:00:00.000Z'),
      reminderMessageTemplate: eventTemplate,
      location: '池袋',
      locationUrl: 'https://maps.example.com/ikebukuro',
      price: 0,
      priceMale: 3000,
      priceFemale: 1000,
      description: '初心者も歓迎です。',
      descriptionMale: null,
      descriptionFemale: null,
      maleDelayMinutes: null,
    });
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      lineChannelAccessToken: 'token',
      reminderMessageTemplate: '団体の標準文面',
    });
    prisma.reservation.findMany.mockResolvedValue([
      { member: { lineUserId: 'U123' } },
    ]);

    await service.sendRemind('tenant-1', 'event-1');

    expect(lineMessaging.sendRemind).toHaveBeenCalledWith(
      'token',
      'U123',
      '20代交流会',
      new Date('2026-06-12T11:00:00.000Z'),
      '池袋',
      eventTemplate,
      expect.objectContaining({
        endAt: new Date('2026-06-12T13:00:00.000Z'),
        locationUrl: 'https://maps.example.com/ikebukuro',
        price: 0,
        priceMale: 3000,
        priceFemale: 1000,
        description: '初心者も歓迎です。',
        includeDescriptionByDefault: false,
      }),
    );
  });

  it('includes the description by default when the event reminder field is empty', async () => {
    prisma.event.findFirst.mockResolvedValue({
      id: 'event-1',
      tenantId: 'tenant-1',
      title: '20代交流会',
      heldAt: new Date('2026-06-12T11:00:00.000Z'),
      endAt: new Date('2026-06-12T13:00:00.000Z'),
      remindAt: new Date('2026-06-11T09:00:00.000Z'),
      reminderMessageTemplate: null,
      description: '初心者も歓迎です。',
      descriptionMale: null,
      descriptionFemale: null,
      maleDelayMinutes: null,
      location: '池袋',
      locationUrl: null,
      price: 1000,
      priceMale: null,
      priceFemale: null,
    });
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      lineChannelAccessToken: 'token',
      reminderMessageTemplate: '【{title}】まもなく開催です！',
    });
    prisma.reservation.findMany.mockResolvedValue([
      { member: { lineUserId: 'U123', gender: '女性' } },
    ]);

    await service.sendRemind('tenant-1', 'event-1');

    expect(lineMessaging.sendRemind).toHaveBeenCalledWith(
      'token',
      'U123',
      '20代交流会',
      new Date('2026-06-12T11:00:00.000Z'),
      '池袋',
      '【{title}】まもなく開催です！',
      expect.objectContaining({
        description: '初心者も歓迎です。',
        gender: '女性',
        includeDescriptionByDefault: true,
      }),
    );
  });
});
