import { BadRequestException } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';

describe('SuperadminService tenant provisioning', () => {
  const makeService = () => {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: data.id,
            name: data.name,
            code: data.code,
            plan: data.plan,
            createdAt: new Date(),
          }),
        ),
      },
      organizerAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new SuperadminService(prisma as never, {} as never);
    return { service, prisma };
  };

  it('creates an empty organizer account when credentials are deferred', async () => {
    const { service, prisma } = makeService();

    await service.createTenant({ name: '引き継ぎ予定の団体' });

    expect(prisma.organizerAccount.findFirst).not.toHaveBeenCalled();
    expect(prisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizerAccounts: { create: {} },
        }),
      }),
    );
  });

  it('rejects a partial organizer credential setup', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.createTenant({
        name: '入力不足の団体',
        email: 'owner@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });

  it('allows the superadmin to provision a verified organizer explicitly', async () => {
    const { service, prisma } = makeService();

    await service.createTenant({
      name: '管理者設定済み団体',
      email: 'Owner@Example.com',
      password: 'password123',
    });

    expect(prisma.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizerAccounts: {
            create: expect.objectContaining({
              email: 'owner@example.com',
              passwordHash: expect.any(String),
              emailVerifiedAt: expect.any(Date),
            }),
          },
        }),
      }),
    );
  });
});
