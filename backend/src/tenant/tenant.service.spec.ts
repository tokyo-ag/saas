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
