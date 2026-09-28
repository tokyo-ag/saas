import { NotFoundException } from '@nestjs/common';
import { CollabService } from './collab.service';

describe('CollabService', () => {
  const prisma = {
    collabGroup: {
      findFirst: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    collabDuplicateOverride: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const service = new CollabService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const tenantA = { id: 'tenant-a', name: 'A', lineDisplayName: null };
  const tenantB = { id: 'tenant-b', name: 'B', lineDisplayName: null };
  const eventA = {
    id: 'event-a',
    title: 'A回',
    heldAt: new Date(),
    tenantId: 'tenant-a',
    tenant: tenantA,
  };
  const eventB = {
    id: 'event-b',
    title: 'B回',
    heldAt: new Date(),
    tenantId: 'tenant-b',
    tenant: tenantB,
  };

  function group(
    overrides: Partial<{ active: boolean; duplicateOverrides: unknown[] }> = {},
  ) {
    return {
      id: 'group-1',
      label: null,
      active: overrides.active ?? true,
      eventLinks: [
        { eventId: 'event-a', event: eventA },
        { eventId: 'event-b', event: eventB },
      ],
      duplicateOverrides: overrides.duplicateOverrides ?? [],
    };
  }

  it('throws NotFoundException for an invalid or inactive token', async () => {
    prisma.collabGroup.findFirst.mockResolvedValue(null);
    await expect(service.getCombinedRoster('bad-token')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('flags reservations sharing the same Member.lineUserId across events as automatic duplicates', async () => {
    prisma.collabGroup.findFirst.mockResolvedValue(group());
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: 'r1',
        eventId: 'event-a',
        status: 'reserved',
        waitlistOrder: null,
        member: {
          name: '太郎',
          grade: null,
          gender: '男性',
          level: null,
          comment: null,
          linePictureUrl: null,
          lineUserId: 'U123',
        },
      },
      {
        id: 'r2',
        eventId: 'event-b',
        status: 'reserved',
        waitlistOrder: null,
        member: {
          name: '太郎',
          grade: null,
          gender: '男性',
          level: null,
          comment: null,
          linePictureUrl: null,
          lineUserId: 'U123',
        },
      },
      {
        id: 'r3',
        eventId: 'event-b',
        status: 'reserved',
        waitlistOrder: null,
        member: {
          name: '花子',
          grade: null,
          gender: '女性',
          level: null,
          comment: null,
          linePictureUrl: null,
          lineUserId: 'U999',
        },
      },
    ]);

    const result = await service.getCombinedRoster('token');
    const byId = new Map(result.participants.map((p) => [p.id, p]));
    expect(byId.get('r1')?.isDuplicate).toBe(true);
    expect(byId.get('r2')?.isDuplicate).toBe(true);
    expect(byId.get('r3')?.isDuplicate).toBe(false);
    expect(result.tenants).toHaveLength(2);
  });

  it('lets a manual override win over the automatic duplicate detection', async () => {
    prisma.collabGroup.findFirst.mockResolvedValue(
      group({
        duplicateOverrides: [{ reservationId: 'r1', isDuplicate: false }],
      }),
    );
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: 'r1',
        eventId: 'event-a',
        status: 'reserved',
        waitlistOrder: null,
        member: {
          name: '太郎',
          grade: null,
          gender: '男性',
          level: null,
          comment: null,
          linePictureUrl: null,
          lineUserId: 'U123',
        },
      },
      {
        id: 'r2',
        eventId: 'event-b',
        status: 'reserved',
        waitlistOrder: null,
        member: {
          name: '太郎',
          grade: null,
          gender: '男性',
          level: null,
          comment: null,
          linePictureUrl: null,
          lineUserId: 'U123',
        },
      },
    ]);

    const result = await service.getCombinedRoster('token');
    const byId = new Map(result.participants.map((p) => [p.id, p]));
    expect(byId.get('r1')?.isDuplicateAuto).toBe(true);
    expect(byId.get('r1')?.isDuplicate).toBe(false);
    expect(byId.get('r2')?.isDuplicate).toBe(true);
  });

  it('rejects a duplicate-override update for a reservation outside the group', async () => {
    prisma.collabGroup.findFirst.mockResolvedValue(group());
    prisma.reservation.findFirst.mockResolvedValue(null);

    await expect(
      service.setDuplicateOverride('token', 'not-in-group', true),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.collabDuplicateOverride.upsert).not.toHaveBeenCalled();
  });

  it('upserts a duplicate override for a reservation that belongs to the group', async () => {
    prisma.collabGroup.findFirst.mockResolvedValue(group());
    prisma.reservation.findFirst.mockResolvedValue({
      id: 'r1',
      eventId: 'event-a',
    });

    await service.setDuplicateOverride('token', 'r1', true);
    expect(prisma.collabDuplicateOverride.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reservationId: 'r1' },
        create: {
          collabGroupId: 'group-1',
          reservationId: 'r1',
          isDuplicate: true,
        },
        update: { isDuplicate: true },
      }),
    );
  });
});
