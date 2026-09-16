import { PublicController } from './public.controller';

describe('PublicController event category filtering', () => {
  const prisma = {
    event: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const controller = new PublicController(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.event.findMany.mockResolvedValue([]);
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
});
