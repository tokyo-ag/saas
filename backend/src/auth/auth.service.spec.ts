import { AuthService } from './auth.service';

describe('AuthService registration verification boundary', () => {
  const makeService = () => {
    const prisma = {
      organizerAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      pendingRegistration: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      tenant: {
        create: jest.fn(),
      },
    };
    const email = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      email as never,
    );
    return { service, prisma, email };
  };

  it('keeps a normal registration pending and does not create a tenant before email verification', async () => {
    const { service, prisma, email } = makeService();

    await service.register('Owner@Example.com', 'password123', 'テスト団体');

    expect(prisma.pendingRegistration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@example.com',
        orgName: 'テスト団体',
      }),
    });
    expect(email.sendVerificationEmail).toHaveBeenCalledWith(
      'owner@example.com',
      expect.any(String),
    );
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });

  it('creates the tenant only when the pending email token is verified', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const prisma = {
      pendingRegistration: {
        findUnique: jest.fn().mockResolvedValue({
          token: 'verification-token',
          email: 'owner@example.com',
          passwordHash: 'hashed-password',
          orgName: '確認済み団体',
          expiresAt,
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
      organizerAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.verifyEmail('verification-token');

    expect(prisma.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '確認済み団体',
        organizerAccounts: {
          create: expect.objectContaining({
            email: 'owner@example.com',
            passwordHash: 'hashed-password',
            emailVerifiedAt: expect.any(Date),
          }),
        },
      }),
    });
    expect(prisma.pendingRegistration.delete).toHaveBeenCalledWith({
      where: { token: 'verification-token' },
    });
  });
});
