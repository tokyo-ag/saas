import { PublicController } from './public.controller';

describe('PublicController', () => {
  const prisma = {
    tenant: {
      findFirst: jest.fn(),
    },
    event: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
  };

  const controller = new PublicController(prisma as never, {} as never, {
    buildForEvents: jest.fn().mockResolvedValue(new Map()),
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.findFirst.mockResolvedValue(null);
    prisma.tenant.findFirst.mockResolvedValue(null);
  });

  it('finds an event by either its legacy category or any selected category', async () => {
    await controller.getEvents('basketball');

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { category: 'basketball' },
            { categories: { has: 'basketball' } },
          ],
        }),
      }),
    );
  });

  it('only lists upcoming or currently running events in the staff view', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      name: '運営団体',
      lineDisplayName: null,
    });

    await controller.getStaffViewEvents('staff-token');

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: { not: 'draft' },
          OR: [
            { endAt: { gte: expect.any(Date) } },
            { endAt: null, heldAt: { gte: expect.any(Date) } },
          ],
        },
        orderBy: { heldAt: 'asc' },
      }),
    );
  });

  it('does not expose a past event through its direct staff-view URL', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      customProfileQuestions: [],
    });

    await expect(
      controller.getStaffViewEvent('staff-token', 'past-event'),
    ).rejects.toThrow('イベントが見つかりません');

    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'past-event',
        tenantId: 'tenant-1',
        status: { not: 'draft' },
        OR: [
          { endAt: { gte: expect.any(Date) } },
          { endAt: null, heldAt: { gte: expect.any(Date) } },
        ],
      },
    });
  });
});
