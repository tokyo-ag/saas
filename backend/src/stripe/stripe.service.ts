import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  getClient(secretKey: string) {
    return new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' });
  }

  async createCheckoutSession(
    secretKey: string,
    opts: {
      eventTitle: string;
      price: number;
      reservationId: string;
      tenantId: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const stripe = this.getClient(secretKey);
    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: opts.eventTitle },
            unit_amount: opts.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: { reservationId: opts.reservationId, tenantId: opts.tenantId },
    });
  }

  constructEvent(webhookSecret: string, payload: Buffer, signature: string) {
    const stripe = new Stripe('dummy', { apiVersion: '2026-04-22.dahlia' });
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
