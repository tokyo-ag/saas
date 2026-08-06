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
    notifyOnReserveApp: true,
    remindEnabled: false,
    remindApp: false,
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
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', plan: 'pro' }),
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
      {
        endAt: new Date('2026-06-12T13:00:00.000Z'),
        locationUrl: 'https://maps.example.com/ikebukuro',
        price: 0,
        priceMale: 3000,
        priceFemale: 1000,
      },
    );
  });
});
