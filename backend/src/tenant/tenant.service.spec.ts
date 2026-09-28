import Stripe from 'stripe';
import { TenantService } from './tenant.service';

const mockCheckoutSessionsCreate = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  })),
}));

describe('TenantService billing checkout', () => {
  const env = process.env;
  const tenant = {
    id: 'tenant-1',
    name: 'COMIU Club',
    code: '12345678',
    plan: 'pro',
    stripeCustomerId: 'cus_test_123',
    lineChannelSecret: null,
    lineChannelAccessToken: null,
    stripeSecretKey: null,
    stripeWebhookSecret: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...env,
      STRIPE_BILLING_SECRET_KEY: 'sk_test_billing',
      STRIPE_PRO_PRICE_ID: 'price_pro',
      STRIPE_STANDARD_PRICE_ID: 'price_standard',
      FRONTEND_URL: 'https://frontend.test',
    };
  });

  afterEach(() => {
    process.env = env;
  });

  it('creates subscription Checkout Sessions without card-only payment methods', async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: 'https://checkout.stripe.test/subscription',
    });
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(tenant),
      },
    };
    const service = new TenantService(prisma as never, {} as never);

    const result = await service.createBillingCheckout('tenant-1', 'pro');

    expect(result).toEqual({
      url: 'https://checkout.stripe.test/subscription',
    });
    expect(Stripe).toHaveBeenCalledWith('sk_test_billing', {
      apiVersion: '2026-04-22.dahlia',
    });
    const sessionPayload = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(sessionPayload).not.toHaveProperty('payment_method_types');
    expect(sessionPayload).toMatchObject({
      mode: 'subscription',
      line_items: [{ price: 'price_pro', quantity: 1 }],
      customer: 'cus_test_123',
      success_url: 'https://frontend.test/admin/settings/plan?success=true',
      cancel_url: 'https://frontend.test/admin/settings/plan',
      metadata: { tenantId: 'tenant-1', plan: 'pro' },
      subscription_data: {
        metadata: { tenantId: 'tenant-1', plan: 'pro' },
      },
    });
  });
});

describe('TenantService tenant settings', () => {
  it('returns LINE setup status flags without secret values', async () => {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          name: 'COMIU Club',
          code: 'comiu',
          lineChannelId: '2010599444',
          lineChannelSecret: 'secret',
          lineChannelAccessToken: 'token',
          liffId: null,
          stripeSecretKey: null,
          stripeWebhookSecret: null,
        }),
      },
    };
    const service = new TenantService(prisma as never, {} as never);

    const result = await service.findOne('tenant-1');

    expect(result).toMatchObject({
      lineChannelId: '2010599444',
      lineBasicConfigured: true,
      lineChannelSecretConfigured: true,
      lineChannelAccessTokenConfigured: true,
      lineConfigured: true,
    });
    expect(result).not.toHaveProperty('lineChannelSecret');
    expect(result).not.toHaveProperty('lineChannelAccessToken');
  });
});

describe('TenantService collaboration tenant list', () => {
  it('returns every available tenant except the current tenant', async () => {
    const tenants = [
      {
        id: 'tenant-2',
        name: 'Another Club',
      },
    ];
    const prisma = {
      tenant: {
        findMany: jest.fn().mockResolvedValue(tenants),
      },
    };
    const service = new TenantService(prisma as never, {} as never);

    await expect(service.listTenantsForCollab('tenant-1')).resolves.toEqual(
      tenants,
    );
    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'tenant-1' },
        deletedAt: null,
        bannedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  });
});

describe('TenantService collaboration request response', () => {
  const pendingMessage = {
    id: 'message-1',
    tenantId: 'tenant-target',
    lineUserId: 'tenant:tenant-target',
    fromUser: false,
    read: true,
    createdAt: new Date('2026-09-28T08:25:00.000Z'),
    content: [
      '【コラボ申請】',
      'Source Clubからコラボ申請が届きました。',
      'イベント名: 交流会',
      '開催日: 2026/11/18 17:00:00',
      '参加予定団体: Source Club、Target Club',
      '参加可否や確認事項は、このチャットへ返信してください。',
    ].join('\n'),
  };

  function createService() {
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Target Club' }),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'tenant-source', name: 'Source Club' }),
      },
      supportMessage: {
        findFirst: jest.fn().mockResolvedValue(pendingMessage),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...pendingMessage,
            ...data,
          }),
        ),
        create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      },
    };
    return {
      prisma,
      service: new TenantService(prisma as never, {} as never),
    };
  }

  it('approves a pending request and notifies its source tenant', async () => {
    const { prisma, service } = createService();

    const result = await service.respondToCollabRequest(
      'tenant-target',
      'message-1',
      'approved',
    );

    expect(prisma.supportMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'message-1',
        tenantId: 'tenant-target',
        lineUserId: 'tenant:tenant-target',
        fromUser: false,
      },
    });
    expect(prisma.supportMessage.update).toHaveBeenCalledWith({
      where: { id: 'message-1' },
      data: {
        content: expect.stringContaining('【コラボ申請（承認済み）】'),
        read: true,
      },
    });
    const updatedContent = prisma.supportMessage.update.mock.calls[0][0].data
      .content as string;
    expect(updatedContent).not.toContain('参加予定団体:');
    expect(updatedContent).toContain('このコラボ申請を承認しました。');
    expect(prisma.supportMessage.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-source',
        lineUserId: 'tenant:tenant-source',
        content: expect.stringContaining(
          'Target Clubがコラボ申請を承認しました。',
        ),
        fromUser: false,
      },
    });
    expect(result.content).toContain('【コラボ申請（承認済み）】');
  });

  it('does not allow another tenant to answer the request', async () => {
    const { prisma, service } = createService();
    prisma.supportMessage.findFirst.mockResolvedValue(null);

    await expect(
      service.respondToCollabRequest(
        'different-tenant',
        'message-1',
        'approved',
      ),
    ).rejects.toThrow('コラボ申請が見つかりません');
    expect(prisma.supportMessage.update).not.toHaveBeenCalled();
  });
});
