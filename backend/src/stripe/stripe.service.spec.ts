import Stripe from 'stripe';
import { StripeService } from './stripe.service';

const mockCheckoutSessionsCreate = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  })),
}));

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StripeService();
  });

  it('creates Checkout Sessions without hardcoding payment method types', async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
    });

    await service.createCheckoutSession('sk_test_123', {
      eventTitle: 'Future Event',
      price: 3000,
      reservationId: 'reservation-1',
      tenantId: 'tenant-1',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });

    expect(Stripe).toHaveBeenCalledWith('sk_test_123', {
      apiVersion: '2026-04-22.dahlia',
    });
    const sessionPayload = mockCheckoutSessionsCreate.mock.calls[0][0];
    expect(sessionPayload).not.toHaveProperty('payment_method_types');
    expect(sessionPayload).toMatchObject({
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: { reservationId: 'reservation-1', tenantId: 'tenant-1' },
    });
  });

  it('constructs webhook events through Stripe signature verification', () => {
    const payload = Buffer.from('{"type":"checkout.session.completed"}');
    const event = { id: 'evt_123', type: 'checkout.session.completed' };
    mockConstructEvent.mockReturnValue(event);

    const result = service.constructEvent('whsec_test', payload, 'sig_test');

    expect(result).toBe(event);
    expect(mockConstructEvent).toHaveBeenCalledWith(
      payload,
      'sig_test',
      'whsec_test',
    );
  });
});
